import { describe, expect, it } from "vitest";
import { canRetry, computeRetryDelayMinutes, classifyBounce } from "../retry-bounce";

describe("canRetry", () => {
  it("allows retrying a failed message under the cap", () => {
    expect(canRetry({ status: "failed", retryCount: 1 })).toBe(true);
  });

  it("never allows retrying a bounced message", () => {
    expect(canRetry({ status: "bounced", retryCount: 0 })).toBe(false);
  });

  it("stops at the retry cap", () => {
    expect(canRetry({ status: "failed", retryCount: 3 })).toBe(false);
  });
});

describe("computeRetryDelayMinutes", () => {
  it("doubles each attempt", () => {
    expect(computeRetryDelayMinutes(0)).toBe(1);
    expect(computeRetryDelayMinutes(2)).toBe(4);
  });
});

describe("classifyBounce", () => {
  it("classifies a nonexistent mailbox as a hard bounce", () => {
    expect(classifyBounce("550 5.1.1 User unknown")).toBe("hard");
  });

  it("classifies a full mailbox as a soft bounce", () => {
    expect(classifyBounce("452 4.2.2 Mailbox full, try again later")).toBe("soft");
  });
});
