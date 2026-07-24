import { describe, expect, it } from "vitest";
import { isEligibleForPurge } from "../retention";

describe("isEligibleForPurge", () => {
  const now = new Date("2026-08-01T00:00:00Z");

  it("is not eligible while within the retention window", () => {
    expect(isEligibleForPurge({ createdAt: new Date("2026-07-25"), retentionDays: 30 }, now)).toBe(false);
  });

  it("is eligible once past the retention window", () => {
    expect(isEligibleForPurge({ createdAt: new Date("2026-06-01"), retentionDays: 30 }, now)).toBe(true);
  });
});
