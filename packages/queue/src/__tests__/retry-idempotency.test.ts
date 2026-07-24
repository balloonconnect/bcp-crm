import { describe, expect, it } from "vitest";
import { computeBackoffMs, shouldRetry, shouldMoveToDeadLetter } from "../retry-policy";
import { buildIdempotencyKey } from "../idempotency";

describe("computeBackoffMs", () => {
  it("doubles from the base delay each attempt", () => {
    expect(computeBackoffMs(1000, 1)).toBe(1000);
    expect(computeBackoffMs(1000, 2)).toBe(2000);
    expect(computeBackoffMs(1000, 3)).toBe(4000);
  });

  it("caps the delay at 10 minutes", () => {
    expect(computeBackoffMs(60_000, 10)).toBe(10 * 60 * 1000);
  });
});

describe("shouldRetry / shouldMoveToDeadLetter", () => {
  it("retries while attempts remain", () => {
    expect(shouldRetry(2, 5)).toBe(true);
    expect(shouldMoveToDeadLetter(2, 5)).toBe(false);
  });

  it("moves to dead-letter once attempts are exhausted", () => {
    expect(shouldRetry(5, 5)).toBe(false);
    expect(shouldMoveToDeadLetter(5, 5)).toBe(true);
  });
});

describe("buildIdempotencyKey", () => {
  it("builds a stable, deterministic key from its parts", () => {
    expect(buildIdempotencyKey("email", ["invoice-reminder", "inv-123"])).toBe("email:invoice-reminder:inv-123");
  });
});
