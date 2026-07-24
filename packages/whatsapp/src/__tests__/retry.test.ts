import { describe, expect, it } from "vitest";
import { canRetry, computeRetryDelayMinutes } from "../retry";

describe("canRetry", () => {
  it("allows retrying a failed message under the cap", () => {
    expect(canRetry({ status: "failed", retryCount: 1 })).toBe(true);
  });

  it("does not allow retrying past the cap", () => {
    expect(canRetry({ status: "failed", retryCount: 3 })).toBe(false);
  });

  it("does not allow retrying a message that isn't failed", () => {
    expect(canRetry({ status: "queued", retryCount: 0 })).toBe(false);
    expect(canRetry({ status: "delivered", retryCount: 0 })).toBe(false);
  });
});

describe("computeRetryDelayMinutes", () => {
  it("doubles the delay each attempt", () => {
    expect(computeRetryDelayMinutes(0)).toBe(1);
    expect(computeRetryDelayMinutes(1)).toBe(2);
    expect(computeRetryDelayMinutes(2)).toBe(4);
  });
});
