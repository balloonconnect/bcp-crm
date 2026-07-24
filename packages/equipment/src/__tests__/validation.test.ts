import { describe, expect, it } from "vitest";
import { equipmentInputSchema, checkoutInputSchema, damageReportInputSchema } from "../validation";

describe("equipmentInputSchema", () => {
  it("accepts a minimal equipment record", () => {
    expect(equipmentInputSchema.safeParse({ name: "Canon R5" }).success).toBe(true);
  });

  it("accepts a full asset record", () => {
    const result = equipmentInputSchema.safeParse({
      name: "Canon R5", category: "Camera", serialNumber: "SN123", purchasePrice: 250000,
      warrantyExpiresAt: new Date().toISOString(), condition: "excellent",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown condition", () => {
    expect(equipmentInputSchema.safeParse({ name: "X", condition: "pristine" }).success).toBe(false);
  });
});

describe("checkoutInputSchema", () => {
  it("accepts a minimal checkout", () => {
    expect(checkoutInputSchema.safeParse({}).success).toBe(true);
  });
});

describe("damageReportInputSchema", () => {
  it("requires a description", () => {
    expect(damageReportInputSchema.safeParse({}).success).toBe(false);
    expect(damageReportInputSchema.safeParse({ description: "Cracked lens mount" }).success).toBe(true);
  });
});
