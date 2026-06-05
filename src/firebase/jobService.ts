import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type { JobStatus } from "../types";

export type JobDoc = {
  id: string;
  customerId: string;
  customerName: string;
  vehicleLabel: string;
  issueLabel: string;
  canMove: boolean;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  dropoffLabel?: string;
  status: JobStatus;
  createdAt: string;
  totalGbp: number;
  /** Set when a driver accepts */
  driverId?: string;
  driverName?: string;
  /** Updated by driver during active job (Phase 2) */
  driverLat?: number;
  driverLng?: number;
  /** Pre-load vehicle inspection */
  inspectionPhotos?: string[];
  inspectionNotes?: string;
  inspectionSentAt?: string;
  inspectionConfirmedAt?: string;
  inspectionDisputed?: boolean;
};

type CreateJobInput = Omit<
  JobDoc,
  "id" | "status" | "createdAt" | "driverId" | "driverName" | "driverLat" | "driverLng"
>;

/** Creates a new job in Firestore with status "requested". Returns the new job ID. */
export async function createJob(input: CreateJobInput): Promise<string> {
  const ref = await addDoc(collection(getFirebaseDb(), "jobs"), {
    ...input,
    status: "requested" as JobStatus,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

/** Subscribes to a single job document in real time. */
export function subscribeToJob(
  jobId: string,
  callback: (job: JobDoc | null) => void,
): Unsubscribe {
  return onSnapshot(doc(getFirebaseDb(), "jobs", jobId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...(snap.data() as Omit<JobDoc, "id">) });
  });
}

/** Subscribes to all open (status = "requested") jobs in real time. */
export function subscribeToOpenJobs(
  callback: (jobs: JobDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "jobs"),
    where("status", "==", "requested"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobDoc, "id">) })));
  });
}

/** Driver accepts an open job — sets status to "en_route" and stamps driver info. */
export async function acceptJob(
  jobId: string,
  driverId: string,
  driverName: string,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), {
    status: "en_route" as JobStatus,
    driverId,
    driverName,
  });
}

/** General-purpose status update (arrived, completed, cancelled). */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), { status });
}

/**
 * Driver submits inspection photos — sets status to "inspection_pending"
 * so the customer sees them on the Live Tracking screen.
 */
export async function saveInspectionPhotos(
  jobId: string,
  photoUrls: string[],
  notes: string,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), {
    inspectionPhotos: photoUrls,
    inspectionNotes: notes,
    inspectionSentAt: new Date().toISOString(),
    status: "inspection_pending" as JobStatus,
  });
}

/**
 * Customer confirms the pre-load inspection — sets inspectionConfirmedAt
 * and moves status back to "arrived" so the driver can proceed.
 */
export async function confirmInspection(jobId: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), {
    inspectionConfirmedAt: new Date().toISOString(),
    status: "arrived" as JobStatus,
  });
}

/**
 * Customer disputes the pre-load inspection — flags the job and cancels.
 */
export async function disputeInspection(jobId: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), {
    inspectionDisputed: true,
    status: "cancelled" as JobStatus,
  });
}

/**
 * Subscribes to a customer's completed/cancelled job history, newest first.
 */
export function subscribeToCustomerJobs(
  customerId: string,
  callback: (jobs: JobDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "jobs"),
    where("customerId", "==", customerId),
    where("status", "in", ["completed", "cancelled"]),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobDoc, "id">) })));
  });
}

/**
 * Subscribes to a driver's completed/cancelled job history, newest first.
 */
export function subscribeToDriverCompletedJobs(
  driverId: string,
  callback: (jobs: JobDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "jobs"),
    where("driverId", "==", driverId),
    where("status", "in", ["completed", "cancelled"]),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JobDoc, "id">) })));
  });
}

/**
 * Subscribes to a driver's currently active job (en_route / arrived / inspection_pending).
 * Returns null if no active job exists.
 */
export function subscribeToDriverActiveJob(
  driverId: string,
  callback: (job: JobDoc | null) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "jobs"),
    where("driverId", "==", driverId),
    where("status", "in", ["en_route", "arrived", "inspection_pending"]),
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...(d.data() as Omit<JobDoc, "id">) });
  });
}

/** Driver broadcasts their live location onto the active job doc (Phase 2 hook). */
export async function updateDriverLocation(
  jobId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), "jobs", jobId), {
    driverLat: lat,
    driverLng: lng,
  });
}
