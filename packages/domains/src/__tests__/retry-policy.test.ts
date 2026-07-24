import { describe, expect, it } from "vitest";
import { nextRetryDelayMinutes, computeNextRetryAt, hasExceededMaxAttempts, evaluateRetry, MAX_VERIFICATION_ATTEMPTS } from "../retry-policy";

describe("nextRetryDelayMinutes", () => {
  it("escalates with each attempt", () => {
    const first = nextRetryDelayMinutes(0);
    const second = nextRetryDelayMinutes(1);
    const third = nextRetryDelayMinutes(2);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it("caps at the longest configured delay for very high attempt numbers", () => {
    expect(nextRetryDelayMinutes(100)).toBe(nextRetryDelayMinutes(7));
  });
});

describe("computeNextRetryAt", () => {
  it("returns a time in the future proportional to the delay", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = computeNextRetryAt(0, now);
    expect(result.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("hasExceededMaxAttempts / evaluateRetry", () => {
  it("does not exceed below the max", () => {
    expect(hasExceededMaxAttempts(MAX_VERIFICATION_ATTEMPTS - 1)).toBe(false);
  });

  it("exceeds at the max", () => {
    expect(hasExceededMaxAttempts(MAX_VERIFICATION_ATTEMPTS)).toBe(true);
  });

  it("evaluateRetry schedules a retry below the max", () => {
    const decision = evaluateRetry(1);
    expect(decision.shouldRetry).toBe(true);
    expect(decision.exhausted).toBe(false);
    expect(decision.nextRetryAt).not.toBeNull();
  });

  it("evaluateRetry stops retrying once exhausted", () => {
    const decision = evaluateRetry(MAX_VERIFICATION_ATTEMPTS);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.exhausted).toBe(true);
    expect(decision.nextRetryAt).toBeNull();
  });
});
