import { describe, expect, it } from "vitest";
import { resolveSlaStatus, resolveSlaDeadline, shouldEscalate } from "../sla";

describe("resolveSlaDeadline", () => {
  it("adds slaHours in milliseconds to the start time", () => {
    const start = new Date("2026-07-14T00:00:00Z");
    const deadline = resolveSlaDeadline(start, 24);
    expect(deadline.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("resolveSlaStatus", () => {
  const start = new Date("2026-07-14T00:00:00Z");
  const deadline = new Date("2026-07-15T00:00:00Z"); // 24h window

  it("returns no_sla when there's no deadline", () => {
    expect(resolveSlaStatus({ status: "pending", slaDeadline: null }, start)).toBe("no_sla");
  });

  it("returns on_track well before the deadline", () => {
    const now = new Date("2026-07-14T02:00:00Z");
    expect(resolveSlaStatus({ status: "pending", slaDeadline: deadline }, start, now)).toBe("on_track");
  });

  it("returns at_risk within the last 20% of the window", () => {
    const now = new Date("2026-07-14T21:00:00Z"); // 3h remaining of 24h = 12.5%
    expect(resolveSlaStatus({ status: "pending", slaDeadline: deadline }, start, now)).toBe("at_risk");
  });

  it("returns breached once past the deadline", () => {
    const now = new Date("2026-07-15T01:00:00Z");
    expect(resolveSlaStatus({ status: "pending", slaDeadline: deadline }, start, now)).toBe("breached");
  });

  it("treats a completed task as on_track even past its deadline", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    expect(resolveSlaStatus({ status: "completed", slaDeadline: deadline }, start, now)).toBe("on_track");
  });
});

describe("shouldEscalate", () => {
  it("escalates a still-open task past its SLA deadline", () => {
    const task = { slaDeadline: new Date("2026-07-14T00:00:00Z"), escalatedAt: null, status: "pending" };
    expect(shouldEscalate(task, new Date("2026-07-14T01:00:00Z"))).toBe(true);
  });

  it("does not escalate a task not yet past its deadline", () => {
    const task = { slaDeadline: new Date("2026-07-20T00:00:00Z"), escalatedAt: null, status: "pending" };
    expect(shouldEscalate(task, new Date("2026-07-14T00:00:00Z"))).toBe(false);
  });

  it("does not re-escalate an already-escalated task", () => {
    const task = { slaDeadline: new Date("2026-07-14T00:00:00Z"), escalatedAt: new Date("2026-07-14T01:00:00Z"), status: "pending" };
    expect(shouldEscalate(task, new Date("2026-07-15T00:00:00Z"))).toBe(false);
  });

  it("does not escalate a completed task", () => {
    const task = { slaDeadline: new Date("2026-07-14T00:00:00Z"), escalatedAt: null, status: "completed" };
    expect(shouldEscalate(task, new Date("2026-07-15T00:00:00Z"))).toBe(false);
  });
});
