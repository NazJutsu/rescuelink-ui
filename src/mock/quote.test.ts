import { buildMockQuote } from "./quote";

describe("buildMockQuote", () => {
  it("weights distance and motorway surcharge", () => {
    const q = buildMockQuote({
      distanceMiles: 10,
      onMotorway: true,
      canMove: false,
    });
    expect(q.baseGbp).toBe(65);
    expect(q.distanceGbp).toBe(32);
    expect(q.motorwaySurchargeGbp).toBe(25);
    expect(q.vatGbp).toBeCloseTo(q.subtotalGbp * 0.2, 2);
    expect(q.totalGbp).toBeCloseTo(q.subtotalGbp + q.vatGbp, 2);
  });
});
