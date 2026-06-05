// ─── Shared domain types used by Cloud Functions ─────────────────────────────
// Mirror of src/types/index.ts — keep in sync.

export type JobStatus =
  | "requested"
  | "matching"
  | "en_route"
  | "arrived"
  | "inspection_pending"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "authorized" | "paid" | "refunded";

export type VehicleClass = "car" | "suv" | "van" | "ev" | "motorcycle";

// ─── Rate card (pricingConfig/current in Firestore) ───────────────────────────
export type RateCard = {
  version: number;
  currency: "GBP";
  vatRatePct: number;
  baseCallout: { rollingPence: number; liftPence: number };
  perMilePence: number;
  vehicleClassMultiplier: Record<VehicleClass, number>;
  serviceFees: {
    winchPence: number;
    flatbedPence: number;
    motorwaySurchargePence: number;
  };
  surge: { multiplier: number; cap: number };
  minMiles: number;
  maxServiceMiles: number;
  quoteTtlSeconds: number;
  updatedAt: string;
};

// ─── Quote breakdown ──────────────────────────────────────────────────────────
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

// ─── Stored quote ─────────────────────────────────────────────────────────────
export type QuoteDoc = {
  id: string;
  userId: string;
  rateCardVersion: number;
  inputs: {
    pickup: { lat: number; lng: number; label: string };
    dropoff?: { lat: number; lng: number; label: string };
    vehicleId: string;
    vehicleClass: VehicleClass;
    canMove: boolean;
    issue: string;
    requestedAt: string;
  };
  breakdown: QuoteBreakdown;
  totalPence: number;
  status: "active" | "consumed" | "expired";
  createdAt: string;
  expiresAt: string;
  consumedByJobId?: string;
};

// ─── Job doc ──────────────────────────────────────────────────────────────────
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
  paymentStatus: PaymentStatus;
  createdAt: string;
  completedAt?: string;
  quoteId: string;
  rateCardVersion: number;
  breakdown: QuoteBreakdown;
  totalPence: number;
  stripePaymentIntentId?: string;
  driverId?: string;
  driverName?: string;
  driverLat?: number;
  driverLng?: number;
  inspectionPhotos?: string[];
  inspectionNotes?: string;
  inspectionSentAt?: string;
  inspectionConfirmedAt?: string;
  inspectionDisputed?: boolean;
};

// ─── Callable request / response shapes ──────────────────────────────────────
export type GetQuoteRequest = {
  pickup: { lat: number; lng: number; label: string };
  dropoff?: { lat: number; lng: number; label: string };
  vehicleId: string;
  vehicleClass: VehicleClass;
  canMove: boolean;
  issue: string;
};

export type GetQuoteResponse = {
  quoteId: string;
  breakdown: QuoteBreakdown;
  totalPence: number;
  expiresAt: string;
};

export type RequestJobRequest = {
  quoteId: string;
  description?: string;
};

export type RequestJobResponse = { jobId: string };

export type AcceptJobRequest = { jobId: string };
export type AcceptJobResponse = { ok: boolean };

export type UpdateJobStatusRequest = {
  jobId: string;
  status: "arrived" | "completed" | "cancelled";
};
export type UpdateJobStatusResponse = { ok: boolean };

export type CreatePaymentIntentRequest = { jobId: string };
export type CreatePaymentIntentResponse = { clientSecret: string; paymentIntentId: string };
