import { describe, expect, it } from "vitest";
import { computeNextSendAt, isDue } from "../schedule";

describe("computeNextSendAt", () => {
  it("advances one day for a daily schedule", () => {
    const next = computeNextSendAt("daily", new Date("2026-08-01T09:00:00Z"));
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-02");
  });

  it("advances 7 days for a weekly schedule", () => {
    const next = computeNextSendAt("weekly", new Date("2026-08-01T09:00:00Z"));
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-08");
  });

  it("advances one calendar month, preserving the day", () => {
    const next = computeNextSendAt("monthly", new Date("2026-01-15T09:00:00Z"));
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(15);
  });

  it("rolls a month-end date to the last valid day of a shorter month", () => {
    const next = computeNextSendAt("monthly", new Date("2026-01-31T09:00:00Z"));
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28); // 2026 is not a leap year
  });
});

describe("isDue", () => {
  it("is due once the next-send time has passed", () => {
    expect(isDue(new Date("2026-08-01"), new Date("2026-08-02"))).toBe(true);
  });

  it("is not due before the next-send time", () => {
    expect(isDue(new Date("2026-08-05"), new Date("2026-08-02"))).toBe(false);
  });
});
