import { describe, expect, it } from "vitest";
import { leaveRangesOverlap, findOverlappingLeave } from "../leave";

describe("leaveRangesOverlap", () => {
  it("detects a clear overlap", () => {
    expect(leaveRangesOverlap({ startDate: new Date("2026-07-10"), endDate: new Date("2026-07-15") }, { startDate: new Date("2026-07-12"), endDate: new Date("2026-07-20") })).toBe(true);
  });

  it("treats touching boundaries as overlapping", () => {
    expect(leaveRangesOverlap({ startDate: new Date("2026-07-10"), endDate: new Date("2026-07-15") }, { startDate: new Date("2026-07-15"), endDate: new Date("2026-07-20") })).toBe(true);
  });

  it("does not flag two clearly separate ranges", () => {
    expect(leaveRangesOverlap({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-05") }, { startDate: new Date("2026-07-10"), endDate: new Date("2026-07-15") })).toBe(false);
  });
});

describe("findOverlappingLeave", () => {
  it("returns only the overlapping entries", () => {
    const existing = [
      { id: "a", startDate: new Date("2026-07-01"), endDate: new Date("2026-07-05") },
      { id: "b", startDate: new Date("2026-07-12"), endDate: new Date("2026-07-14") },
    ];
    const result = findOverlappingLeave({ startDate: new Date("2026-07-13"), endDate: new Date("2026-07-16") }, existing);
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });
});
