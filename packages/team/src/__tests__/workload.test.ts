import { describe, expect, it } from "vitest";
import { computeWorkloadSummary } from "../workload";

describe("computeWorkloadSummary", () => {
  const now = new Date("2026-07-14T00:00:00Z");

  it("counts pending, in_progress, and blocked as active", () => {
    const tasks = [{ status: "pending", dueDate: null }, { status: "in_progress", dueDate: null }, { status: "blocked", dueDate: null }, { status: "completed", dueDate: null }];
    expect(computeWorkloadSummary(tasks, 0, now).activeTaskCount).toBe(3);
  });

  it("counts overdue tasks that are still open", () => {
    const tasks = [
      { status: "pending", dueDate: new Date("2026-07-01") },
      { status: "completed", dueDate: new Date("2026-07-01") },
    ];
    expect(computeWorkloadSummary(tasks, 0, now).overdueTaskCount).toBe(1);
  });

  it("passes through the upcoming event count as given", () => {
    expect(computeWorkloadSummary([], 5, now).upcomingEventCount).toBe(5);
  });
});
