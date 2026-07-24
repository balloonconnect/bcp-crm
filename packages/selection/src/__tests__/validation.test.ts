import { describe, expect, it } from "vitest";
import { selectionActionSchema, albumSettingsInputSchema, otpVerifySchema } from "../validation";

describe("selectionActionSchema", () => {
  it("accepts each of the 5 actions", () => {
    for (const action of ["select", "deselect", "favorite", "unfavorite", "reject"]) {
      expect(selectionActionSchema.safeParse({ action }).success).toBe(true);
    }
  });
});

describe("albumSettingsInputSchema", () => {
  it("accepts category limits", () => {
    const result = albumSettingsInputSchema.safeParse({ selectionLimit: 40, categoryLimits: [{ category: "ceremony", limitCount: 15 }] });
    expect(result.success).toBe(true);
  });
});

describe("otpVerifySchema", () => {
  it("requires exactly 6 digits", () => {
    expect(otpVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ code: "12" }).success).toBe(false);
  });
});
