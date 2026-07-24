import { describe, expect, it } from "vitest";
import { computeRelationshipScore } from "../scoring";

describe("computeRelationshipScore", () => {
  it("scores a loyal, paid-up, happy client highly", () => {
    const result = computeRelationshipScore({
      completedEventsCount: 3,
      hasOverdueInvoice: false,
      averageFeedbackRating: 5,
      daysSinceLastCommunication: 5,
      referralsGivenCount: 2,
      tenureDays: 400,
    });
    expect(result.score).toBeGreaterThan(70);
  });

  it("penalizes an overdue invoice", () => {
    const base = { completedEventsCount: 1, averageFeedbackRating: null, daysSinceLastCommunication: null, referralsGivenCount: 0, tenureDays: 10 };
    const withOverdue = computeRelationshipScore({ ...base, hasOverdueInvoice: true });
    const withoutOverdue = computeRelationshipScore({ ...base, hasOverdueInvoice: false });
    expect(withOverdue.score).toBeLessThan(withoutOverdue.score);
  });

  it("keeps the score within 0-100", () => {
    const result = computeRelationshipScore({ completedEventsCount: 0, hasOverdueInvoice: true, averageFeedbackRating: 1, daysSinceLastCommunication: 400, referralsGivenCount: 0, tenureDays: 1 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("gives a brand-new client a neutral baseline score", () => {
    const result = computeRelationshipScore({ completedEventsCount: 0, hasOverdueInvoice: false, averageFeedbackRating: null, daysSinceLastCommunication: null, referralsGivenCount: 0, tenureDays: 0 });
    expect(result.score).toBe(50);
  });
});
