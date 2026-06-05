import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./lib/admin";
import { assertAuthed } from "./lib/auth";
import type {
  QuoteDoc,
  JobDoc,
  JobStatus,
  RequestJobRequest,
  RequestJobResponse,
  AcceptJobRequest,
  AcceptJobResponse,
  UpdateJobStatusRequest,
  UpdateJobStatusResponse,
} from "./lib/types";

// ─── requestJob ───────────────────────────────────────────────────────────────

/**
 * Validates a stored quote and creates a job with the server's price.
 * The client never supplies a price — only a quoteId.
 */
export const requestJob = onCall<RequestJobRequest, Promise<RequestJobResponse>>(
  { region: "europe-west2" },
  async (req) => {
    const uid = assertAuthed(req);
    const { quoteId, description } = req.data;

    if (!quoteId) throw new HttpsError("invalid-argument", "quoteId required.");

    const quoteRef = db.collection("quotes").doc(quoteId);
    const jobRef = db.collection("jobs").doc();

    await db.runTransaction(async (tx) => {
      const quoteSnap = await tx.get(quoteRef);
      if (!quoteSnap.exists) throw new HttpsError("not-found", "Quote not found.");

      const quote = quoteSnap.data() as QuoteDoc;

      if (quote.userId !== uid) {
        throw new HttpsError("permission-denied", "Quote belongs to another user.");
      }
      if (quote.status !== "active") {
        throw new HttpsError("failed-precondition", `Quote is ${quote.status}.`);
      }
      if (new Date(quote.expiresAt) < new Date()) {
        tx.update(quoteRef, { status: "expired" });
        throw new HttpsError("deadline-exceeded", "Quote has expired. Please get a new quote.");
      }

      // Fetch the customer's display name
      const userSnap = await tx.get(db.collection("users").doc(uid));
      const customerName: string = userSnap.exists
        ? ((userSnap.data() as { firstName?: string }).firstName ?? "Customer")
        : "Customer";

      const now = new Date().toISOString();
      const jobData: Omit<JobDoc, "id"> = {
        customerId: uid,
        customerName,
        vehicleLabel: quote.inputs.vehicleId,
        issueLabel: description
          ? `${quote.inputs.issue} — ${description}`
          : quote.inputs.issue,
        canMove: quote.inputs.canMove,
        pickupLat: quote.inputs.pickup.lat,
        pickupLng: quote.inputs.pickup.lng,
        pickupLabel: quote.inputs.pickup.label,
        dropoffLabel: quote.inputs.dropoff?.label,
        status: "requested" as JobStatus,
        paymentStatus: "unpaid",
        quoteId,
        rateCardVersion: quote.rateCardVersion,
        breakdown: quote.breakdown,
        totalPence: quote.totalPence,
        createdAt: now,
      };

      tx.set(jobRef, jobData);
      tx.update(quoteRef, {
        status: "consumed",
        consumedByJobId: jobRef.id,
      });
    });

    return { jobId: jobRef.id };
  },
);

// ─── acceptJob ────────────────────────────────────────────────────────────────

/**
 * Atomically claims an open job for the calling driver.
 * Prevents two drivers from accepting the same job simultaneously.
 */
export const acceptJob = onCall<AcceptJobRequest, Promise<AcceptJobResponse>>(
  { region: "europe-west2" },
  async (req) => {
    const uid = assertAuthed(req);
    const { jobId } = req.data;

    if (!jobId) throw new HttpsError("invalid-argument", "jobId required.");

    const jobRef = db.collection("jobs").doc(jobId);
    const driverSnap = await db.collection("operators").doc(uid).get();

    if (!driverSnap.exists) {
      throw new HttpsError("not-found", "Operator profile not found.");
    }
    const driverData = driverSnap.data() as { verificationStatus?: string; legalFullName?: string };
    if (driverData.verificationStatus !== "approved") {
      throw new HttpsError("permission-denied", "Your account is not yet approved.");
    }

    const userSnap = await db.collection("users").doc(uid).get();
    const driverName: string = userSnap.exists
      ? ((userSnap.data() as { firstName?: string }).firstName ?? "Driver")
      : driverData.legalFullName ?? "Driver";

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) throw new HttpsError("not-found", "Job not found.");

      const job = jobSnap.data() as JobDoc;
      if (job.status !== "requested") {
        throw new HttpsError("failed-precondition", "Job is no longer available.");
      }
      if (job.driverId) {
        throw new HttpsError("already-exists", "Job already accepted by another driver.");
      }

      tx.update(jobRef, {
        driverId: uid,
        driverName,
        status: "en_route" as JobStatus,
      });
    });

    return { ok: true };
  },
);

// ─── updateJobStatus ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  en_route: ["arrived", "cancelled"],
  arrived: ["inspection_pending", "completed", "cancelled"],
  inspection_pending: ["arrived", "cancelled"],
};

export const updateJobStatus = onCall<UpdateJobStatusRequest, Promise<UpdateJobStatusResponse>>(
  { region: "europe-west2" },
  async (req) => {
    const uid = assertAuthed(req);
    const { jobId, status } = req.data;

    if (!jobId || !status) {
      throw new HttpsError("invalid-argument", "jobId and status required.");
    }

    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) throw new HttpsError("not-found", "Job not found.");

    const job = jobSnap.data() as JobDoc;

    const isDriver = job.driverId === uid;
    const isCustomer = job.customerId === uid;

    if (!isDriver && !isCustomer) {
      throw new HttpsError("permission-denied", "Not authorised for this job.");
    }

    const allowed = VALID_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(status)) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot transition from '${job.status}' to '${status}'.`,
      );
    }

    const patch: Record<string, unknown> = { status };
    if (status === "completed") {
      patch.completedAt = new Date().toISOString();
    }

    await jobRef.update(patch);

    return { ok: true };
  },
);

// ─── onUserDocCreated — set role custom claim ─────────────────────────────────

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { auth } from "./lib/admin";

export const onUserDocCreated = onDocumentCreated(
  { document: "users/{userId}", region: "europe-west2" },
  async (event) => {
    const data = event.data?.data() as { role?: string } | undefined;
    if (!data?.role) return;

    const uid = event.params.userId;
    try {
      await auth.setCustomUserClaims(uid, { role: data.role });
    } catch (err) {
      console.error("Failed to set custom claim for", uid, err);
    }
  },
);
