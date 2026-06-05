import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/admin";
import { assertAuthed } from "./lib/auth";
import { getStripe, stripeSecretKey, stripeWebhookSecret } from "./lib/stripe";
import type {
  JobDoc,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
} from "./lib/types";

// ─── createPaymentIntent ──────────────────────────────────────────────────────

/**
 * Called by BookingFlowScreen after the job is created.
 * Returns a Stripe client_secret to present the Payment Sheet on device.
 */
export const createPaymentIntent = onCall<
  CreatePaymentIntentRequest,
  Promise<CreatePaymentIntentResponse>
>(
  {
    region: "europe-west2",
    secrets: [stripeSecretKey],
  },
  async (req) => {
    const uid = assertAuthed(req);
    const { jobId } = req.data;

    if (!jobId) throw new HttpsError("invalid-argument", "jobId required.");

    const jobSnap = await db.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) throw new HttpsError("not-found", "Job not found.");

    const job = jobSnap.data() as JobDoc;

    if (job.customerId !== uid) {
      throw new HttpsError("permission-denied", "Not your job.");
    }
    if (job.paymentStatus !== "unpaid") {
      throw new HttpsError("failed-precondition", `Payment already ${job.paymentStatus}.`);
    }

    const stripe = getStripe();

    const intent = await stripe.paymentIntents.create({
      amount: job.totalPence,
      currency: "gbp",
      metadata: {
        jobId,
        customerId: uid,
        quoteId: job.quoteId ?? "",
      },
      description: `RescueLink recovery — ${job.issueLabel}`,
      automatic_payment_methods: { enabled: true },
    });

    await db.collection("jobs").doc(jobId).update({
      stripePaymentIntentId: intent.id,
      paymentStatus: "authorized",
    });

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
    };
  },
);

// ─── stripeWebhook ─────────────────────────────────────────────────────────────

/**
 * Stripe webhook endpoint — marks job as paid when payment_intent.succeeded fires.
 * Never trust the client to mark a job paid; this is the only code path.
 */
export const stripeWebhook = onRequest(
  {
    region: "europe-west2",
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).send("Missing stripe-signature header.");
      return;
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value(),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid signature";
      res.status(400).send(`Webhook signature verification failed: ${msg}`);
      return;
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as { id: string; metadata: Record<string, string> };
      const jobId = intent.metadata?.jobId;

      if (jobId) {
        await db.collection("jobs").doc(jobId).update({
          paymentStatus: "paid",
        });
        console.log(`Job ${jobId} marked paid via Stripe webhook.`);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as { id: string; metadata: Record<string, string> };
      const jobId = intent.metadata?.jobId;
      if (jobId) {
        await db.collection("jobs").doc(jobId).update({
          paymentStatus: "unpaid",
          stripePaymentIntentId: null,
        });
      }
    }

    res.json({ received: true });
  },
);
