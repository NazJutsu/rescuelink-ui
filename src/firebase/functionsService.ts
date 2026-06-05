/**
 * Client-side callable wrappers for Cloud Functions.
 * All money-critical operations (pricing, job creation, job acceptance,
 * status changes, payments) go through here instead of direct Firestore writes.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "./config";

function getFns() {
  return getFunctions(getFirebaseApp(), "europe-west2");
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export type VehicleClass = "car" | "suv" | "van" | "ev" | "motorcycle";

export type QuoteBreakdown = {
  baseCalloutPence: number;
  distanceMiles: number;
  perMilePence: number;
  vehicleClass: VehicleClass;
  vehicleMultiplier: number;
  distancePence: number;
  winchPence: number;
  flatbedPence: number;
  motorwaySurchargePence: number;
  surgeMultiplier: number;
  surgePence: number;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
};

export type GetQuoteRequest = {
  pickup: { lat: number; lng: number; label: string };
  dropoff?: { lat: number; lng: number; label: string };
  vehicleId: string;
  vehicleClass: VehicleClass;
  canMove: boolean;
  issue: string;
  distanceMiles?: number;
  onMotorway?: boolean;
};

export type GetQuoteResponse = {
  quoteId: string;
  breakdown: QuoteBreakdown;
  totalPence: number;
  expiresAt: string;
};

export async function callGetQuote(req: GetQuoteRequest): Promise<GetQuoteResponse> {
  const fn = httpsCallable<GetQuoteRequest, GetQuoteResponse>(getFns(), "getQuote");
  const result = await fn(req);
  return result.data;
}

// ─── Jobs ──────────────────────────────────────────────────────────────────────

export async function callRequestJob(quoteId: string, description?: string): Promise<string> {
  const fn = httpsCallable<{ quoteId: string; description?: string }, { jobId: string }>(
    getFns(),
    "requestJob",
  );
  const result = await fn({ quoteId, description });
  return result.data.jobId;
}

export async function callAcceptJob(jobId: string): Promise<void> {
  const fn = httpsCallable<{ jobId: string }, { ok: boolean }>(getFns(), "acceptJob");
  await fn({ jobId });
}

export async function callUpdateJobStatus(
  jobId: string,
  status: "arrived" | "completed" | "cancelled",
): Promise<void> {
  const fn = httpsCallable<
    { jobId: string; status: string },
    { ok: boolean }
  >(getFns(), "updateJobStatus");
  await fn({ jobId, status });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function callCreatePaymentIntent(
  jobId: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const fn = httpsCallable<
    { jobId: string },
    { clientSecret: string; paymentIntentId: string }
  >(getFns(), "createPaymentIntent");
  const result = await fn({ jobId });
  return result.data;
}

/** Convert pence to display pounds string: e.g. 5999 → "59.99" */
export function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}
