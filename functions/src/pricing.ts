import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/admin";
import { assertAuthed } from "./lib/auth";
import type {
  RateCard,
  QuoteBreakdown,
  QuoteDoc,
  GetQuoteRequest,
  GetQuoteResponse,
  VehicleClass,
} from "./lib/types";

// ─── Pure fare engine ─────────────────────────────────────────────────────────

export function priceQuote(
  inputs: {
    distanceMiles: number;
    onMotorway: boolean;
    canMove: boolean;
    vehicleClass: VehicleClass;
    winchRequired: boolean;
    flatbedRequired: boolean;
    requestedAt: string;
  },
  rate: RateCard,
): QuoteBreakdown {
  const effectiveMiles = Math.max(inputs.distanceMiles, rate.minMiles);

  const baseCalloutPence = inputs.canMove
    ? rate.baseCallout.rollingPence
    : rate.baseCallout.liftPence;

  const vehicleMultiplier = rate.vehicleClassMultiplier[inputs.vehicleClass] ?? 1.0;
  const distancePence = Math.round(
    effectiveMiles * rate.perMilePence * vehicleMultiplier,
  );

  const winchPence = inputs.winchRequired ? rate.serviceFees.winchPence : 0;
  const flatbedPence = inputs.flatbedRequired ? rate.serviceFees.flatbedPence : 0;
  const motorwaySurchargePence = inputs.onMotorway
    ? rate.serviceFees.motorwaySurchargePence
    : 0;

  const surgeMultiplier = Math.min(rate.surge.multiplier, rate.surge.cap);
  const baseLeg = baseCalloutPence + distancePence + winchPence + flatbedPence + motorwaySurchargePence;
  const surgePence = Math.round(baseLeg * (surgeMultiplier - 1));

  const subtotalPence = baseLeg + surgePence;
  const vatPence = Math.round(subtotalPence * (rate.vatRatePct / 100));
  const totalPence = subtotalPence + vatPence;

  return {
    baseCalloutPence,
    distanceMiles: inputs.distanceMiles,
    perMilePence: rate.perMilePence,
    vehicleClass: inputs.vehicleClass,
    vehicleMultiplier,
    distancePence,
    winchPence,
    flatbedPence,
    motorwaySurchargePence,
    surgeMultiplier,
    surgePence,
    subtotalPence,
    vatPence,
    totalPence,
  };
}

// ─── Default rate card (written to Firestore on first run) ────────────────────

export const DEFAULT_RATE_CARD: Omit<RateCard, "updatedAt"> = {
  version: 1,
  currency: "GBP",
  vatRatePct: 20,
  baseCallout: { rollingPence: 4500, liftPence: 6500 },
  perMilePence: 320,
  vehicleClassMultiplier: {
    car: 1.0,
    suv: 1.15,
    van: 1.3,
    ev: 1.1,
    motorcycle: 0.9,
  },
  serviceFees: {
    winchPence: 2000,
    flatbedPence: 1500,
    motorwaySurchargePence: 2500,
  },
  surge: { multiplier: 1.0, cap: 2.0 },
  minMiles: 1,
  maxServiceMiles: 150,
  quoteTtlSeconds: 600,
};

async function getOrCreateRateCard(): Promise<RateCard> {
  const ref = db.collection("pricingConfig").doc("current");
  const snap = await ref.get();
  if (snap.exists) return snap.data() as RateCard;

  const card: RateCard = { ...DEFAULT_RATE_CARD, updatedAt: new Date().toISOString() };
  await ref.set(card);
  return card;
}

// ─── getQuote callable ────────────────────────────────────────────────────────

/**
 * Called by BookingFlowScreen when it opens.
 * Returns a server-computed price and a quoteId the client passes back to requestJob.
 */
export const getQuote = onCall<GetQuoteRequest, Promise<GetQuoteResponse>>(
  { region: "europe-west2" },
  async (req) => {
    const uid = assertAuthed(req);
    const data = req.data;

    const rate = await getOrCreateRateCard();

    if (!data.pickup?.lat || !data.pickup?.lng) {
      throw new HttpsError("invalid-argument", "pickup coordinates required.");
    }

    // Use distanceMiles from OSRM if provided by client, otherwise default.
    // Phase 2: replace with a server-side keyed routing call.
    const distanceMiles: number =
      typeof (data as unknown as { distanceMiles?: number }).distanceMiles === "number"
        ? (data as unknown as { distanceMiles: number }).distanceMiles
        : 8.2;
    const onMotorway: boolean =
      typeof (data as unknown as { onMotorway?: boolean }).onMotorway === "boolean"
        ? (data as unknown as { onMotorway: boolean }).onMotorway
        : false;

    if (distanceMiles > rate.maxServiceMiles) {
      throw new HttpsError(
        "out-of-range",
        `Trip distance (${distanceMiles.toFixed(1)} mi) exceeds our service area (${rate.maxServiceMiles} mi).`,
      );
    }

    const breakdown = priceQuote(
      {
        distanceMiles,
        onMotorway,
        canMove: data.canMove,
        vehicleClass: data.vehicleClass ?? "car",
        winchRequired: false,
        flatbedRequired: !data.canMove,
        requestedAt: new Date().toISOString(),
      },
      rate,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + rate.quoteTtlSeconds * 1000).toISOString();

    const quoteRef = db.collection("quotes").doc();
    const quoteDoc: Omit<QuoteDoc, "id"> = {
      userId: uid,
      rateCardVersion: rate.version,
      inputs: {
        pickup: data.pickup,
        dropoff: data.dropoff,
        vehicleId: data.vehicleId,
        vehicleClass: data.vehicleClass ?? "car",
        canMove: data.canMove,
        issue: data.issue,
        requestedAt: now.toISOString(),
      },
      breakdown,
      totalPence: breakdown.totalPence,
      status: "active",
      createdAt: now.toISOString(),
      expiresAt,
    };

    await quoteRef.set(quoteDoc);

    return {
      quoteId: quoteRef.id,
      breakdown,
      totalPence: breakdown.totalPence,
      expiresAt,
    };
  },
);
