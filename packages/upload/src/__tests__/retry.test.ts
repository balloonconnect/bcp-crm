import { describe, expect, it } from "vitest";
import { canRetry, computeRetryDelaySeconds, canPause, canResume } from "../retry";

describe("canRetry", () => {
  it("allows retrying a failed session under the cap", () => {
    expect(canRetry({ status: "failed", retryCount: 2 })).toBe(true);
  });

  it("stops at the retry cap", () => {
    expect(canRetry({ status: "failed", retryCount: 5 })).toBe(false);
  });

  it("does not retry a session that isn't failed", () => {
    expect(canRetry({ status: "uploading", retryCount: 0 })).toBe(false);
  });
});

describe("computeRetryDelaySeconds", () => {
  it("doubles each attempt up to a cap", () => {
    expect(computeRetryDelaySeconds(0)).toBe(1);
    expect(computeRetryDelaySeconds(3)).toBe(8);
    expect(computeRetryDelaySeconds(10)).toBe(60);
  });
});

describe("canPause / canResume", () => {
  it("allows pausing an active upload", () => {
    expect(canPause("uploading")).toBe(true);
    expect(canPause("pending")).toBe(true);
  });

  it("does not allow pausing a completed upload", () => {
    expect(canPause("completed")).toBe(false);
  });

  it("only allows resuming a paused upload", () => {
    expect(canResume("paused")).toBe(true);
    expect(canResume("uploading")).toBe(false);
  });
});
