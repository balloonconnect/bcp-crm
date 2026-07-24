import { describe, expect, it } from "vitest";
import { evaluateCondition } from "../condition-evaluation";
import { hasRetriesRemaining, computeRetryDelayMinutes } from "../retry";
import { isRateLimited } from "../rate-limiting";

describe("evaluateCondition", () => {
  it("evaluates greater_than on a nested field", () => {
    expect(evaluateCondition({ field: "invoice.daysOverdue", operator: "greater_than", value: 5 }, { invoice: { daysOverdue: 10 } })).toBe(true);
  });

  it("evaluates equals on a string field", () => {
    expect(evaluateCondition({ field: "lead.eventType", operator: "equals", value: "wedding" }, { lead: { eventType: "wedding" } })).toBe(true);
  });

  it("returns false when the field is missing", () => {
    expect(evaluateCondition({ field: "missing.field", operator: "equals", value: "x" }, {})).toBe(false);
  });
});

describe("hasRetriesRemaining / computeRetryDelayMinutes", () => {
  it("allows retries under the cap", () => {
    expect(hasRetriesRemaining(1)).toBe(true);
    expect(hasRetriesRemaining(3)).toBe(false);
  });

  it("backs off exponentially, capped", () => {
    expect(computeRetryDelayMinutes(1)).toBe(2);
    expect(computeRetryDelayMinutes(10)).toBe(30);
  });
});

describe("isRateLimited", () => {
  it("is not limited under the threshold", () => {
    expect(isRateLimited(50, 100)).toBe(false);
  });

  it("is limited once the threshold is reached", () => {
    expect(isRateLimited(100, 100)).toBe(true);
  });
});
