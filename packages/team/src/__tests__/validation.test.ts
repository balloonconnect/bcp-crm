import { describe, expect, it } from "vitest";
import { teamProfileInputSchema, leaveRequestInputSchema, performanceNoteInputSchema, freelancerPaymentInputSchema } from "../validation";

describe("teamProfileInputSchema", () => {
  it("accepts an employee salary update", () => {
    expect(teamProfileInputSchema.safeParse({ employmentType: "employee", salaryAmount: 5000000 }).success).toBe(true);
  });

  it("accepts a freelancer rate update", () => {
    expect(teamProfileInputSchema.safeParse({ employmentType: "freelancer", freelancerRateAmount: 800000, freelancerRateUnit: "per_event" }).success).toBe(true);
  });

  it("rejects an unknown employment type", () => {
    expect(teamProfileInputSchema.safeParse({ employmentType: "contractor" }).success).toBe(false);
  });
});

describe("leaveRequestInputSchema", () => {
  it("accepts a minimal leave request", () => {
    const result = leaveRequestInputSchema.safeParse({ startDate: new Date().toISOString(), endDate: new Date().toISOString() });
    expect(result.success).toBe(true);
  });
});

describe("performanceNoteInputSchema", () => {
  it("accepts a rated note", () => {
    expect(performanceNoteInputSchema.safeParse({ periodLabel: "Q3 2026", ratingScore: 4, note: "Great work this quarter." }).success).toBe(true);
  });
  it("rejects a rating outside 1-5", () => {
    expect(performanceNoteInputSchema.safeParse({ periodLabel: "Q3 2026", ratingScore: 6 }).success).toBe(false);
  });
});

describe("freelancerPaymentInputSchema", () => {
  it("accepts a minimal payment", () => {
    expect(freelancerPaymentInputSchema.safeParse({ amount: 500000 }).success).toBe(true);
  });
  it("rejects a non-positive amount", () => {
    expect(freelancerPaymentInputSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});
