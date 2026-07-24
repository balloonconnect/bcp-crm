import { describe, expect, it } from "vitest";
import { computeTaskCompletionSummary, computeAttendanceRate } from "../performance";

describe("computeTaskCompletionSummary", () => {
  it("computes completion rate across all assigned tasks", () => {
    const tasks = [
      { status: "completed", dueDate: null, completedAt: null },
      { status: "completed", dueDate: null, completedAt: null },
      { status: "pending", dueDate: null, completedAt: null },
      { status: "pending", dueDate: null, completedAt: null },
    ];
    expect(computeTaskCompletionSummary(tasks).completionRatePercent).toBe(50);
  });

  it("computes on-time rate only among completed tasks that had a due date", () => {
    const tasks = [
      { status: "completed", dueDate: new Date("2026-07-10"), completedAt: new Date("2026-07-09") }, // on time
      { status: "completed", dueDate: new Date("2026-07-10"), completedAt: new Date("2026-07-12") }, // late
      { status: "completed", dueDate: null, completedAt: new Date("2026-07-05") }, // no due date, excluded
    ];
    expect(computeTaskCompletionSummary(tasks).onTimeRatePercent).toBe(50);
  });

  it("returns 0 rates for no tasks rather than NaN", () => {
    const result = computeTaskCompletionSummary([]);
    expect(result.completionRatePercent).toBe(0);
    expect(result.onTimeRatePercent).toBe(0);
  });
});

describe("computeAttendanceRate", () => {
  it("treats present and half_day as attended", () => {
    const records = [{ status: "present" }, { status: "half_day" }, { status: "absent" }, { status: "leave" }];
    expect(computeAttendanceRate(records)).toBe(50);
  });

  it("returns 0 for no records", () => {
    expect(computeAttendanceRate([])).toBe(0);
  });
});
