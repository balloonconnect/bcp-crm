import { describe, expect, it } from "vitest";
import { serviceInputSchema, packageInputSchema, validatePaymentScheduleTotal } from "../validation";

describe("serviceInputSchema", () => {
  it("accepts a well-formed service", () => {
    expect(serviceInputSchema.safeParse({ name: "Drone", category: "aerial_and_specialty", internalPrice: 500000 }).success).toBe(true);
  });

  it("rejects an unknown category", () => {
    expect(serviceInputSchema.safeParse({ name: "X", category: "bogus", internalPrice: 100 }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(serviceInputSchema.safeParse({ name: "X", category: "photography", internalPrice: -100 }).success).toBe(false);
  });
});

describe("packageInputSchema", () => {
  it("accepts a minimal package", () => {
    expect(packageInputSchema.safeParse({ name: "Wedding Essentials", eventType: "wedding", customerFacingTotal: 1500000 }).success).toBe(true);
  });
});

describe("validatePaymentScheduleTotal", () => {
  it("accepts a schedule that sums to 100", () => {
    expect(validatePaymentScheduleTotal([{ percentage: 30 }, { percentage: 40 }, { percentage: 30 }]).valid).toBe(true);
  });

  it("accepts a schedule within rounding tolerance", () => {
    expect(validatePaymentScheduleTotal([{ percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 }]).valid).toBe(true);
  });

  it("rejects a schedule that doesn't sum to 100", () => {
    expect(validatePaymentScheduleTotal([{ percentage: 50 }, { percentage: 30 }]).valid).toBe(false);
  });

  it("treats an empty schedule as valid (no schedule configured yet)", () => {
    expect(validatePaymentScheduleTotal([]).valid).toBe(true);
  });
});
