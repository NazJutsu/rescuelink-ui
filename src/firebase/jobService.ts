import {
  addDoc,
  collection,
  doc,
  onSnapshot,
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
