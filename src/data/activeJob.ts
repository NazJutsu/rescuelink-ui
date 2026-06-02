import type { ActiveJob } from "../types";

/** Ephemeral active job for live tracking (mock). */
export function buildMockActiveJob(input: {
  jobId: string;
  quoteTotal: number;
  issueLabel: string;
  vehicleLabel: string;
  pickupLat?: number;
  pickupLng?: number;
}): ActiveJob {
  const pickupLat = input.pickupLat ?? 51.5245;
  const pickupLng = input.pickupLng ?? -0.0772;
  return {
    id: input.jobId,
    customerName: "You",
    operatorName: "James M.",
    operatorRating: 4.9,
    vehicleLabel: input.vehicleLabel,
    issueLabel: input.issueLabel,
    totalGbp: input.quoteTotal,
    etaMinutes: 6,
    status: "en_route",
    pickupLat,
    pickupLng,
    driverLat: pickupLat + 0.006,
    driverLng: pickupLng - 0.013,
  };
}
