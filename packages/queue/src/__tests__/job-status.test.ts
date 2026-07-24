import { describe, expect, it } from "vitest";
import { canTransitionJobStatus, canCancelJob } from "../job-status";

describe("canTransitionJobStatus", () => {
  it("allows queued to running", () => {
    expect(canTransitionJobStatus("queued", "running")).toBe(true);
  });

  it("allows failed to retrying or dead_letter", () => {
    expect(canTransitionJobStatus("failed", "retrying")).toBe(true);
    expect(canTransitionJobStatus("failed", "dead_letter")).toBe(true);
  });

  it("rejects a transition out of a terminal state", () => {
    expect(canTransitionJobStatus("completed", "running")).toBe(false);
    expect(canTransitionJobStatus("dead_letter", "retrying")).toBe(false);
  });
});

describe("canCancelJob", () => {
  it("allows cancelling a queued, running, or retrying job", () => {
    expect(canCancelJob("queued")).toBe(true);
    expect(canCancelJob("running")).toBe(true);
    expect(canCancelJob("retrying")).toBe(true);
  });

  it("does not allow cancelling a job already in a terminal state", () => {
    expect(canCancelJob("completed")).toBe(false);
    expect(canCancelJob("dead_letter")).toBe(false);
  });
});
