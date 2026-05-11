import type { QuoteBreakdown } from "./types";

const VAT_RATE = 0.2;

export function buildMockQuote(input: {
  distanceMiles: number;
  onMotorway: boolean;
  canMove: boolean;
}): QuoteBreakdown {
  const baseGbp = input.canMove ? 45 : 65;
  const distanceGbp = Math.round(input.distanceMiles * 3.2 * 10) / 10;
  const motorwaySurchargeGbp = input.onMotorway ? 25 : 0;
  const subtotalGbp =
    Math.round((baseGbp + distanceGbp + motorwaySurchargeGbp) * 100) / 100;
  const vatGbp = Math.round(subtotalGbp * VAT_RATE * 100) / 100;
  const totalGbp = Math.round((subtotalGbp + vatGbp) * 100) / 100;
  return {
    baseGbp,
    distanceGbp,
    motorwaySurchargeGbp,
    subtotalGbp,
    vatGbp,
    totalGbp,
  };
}
