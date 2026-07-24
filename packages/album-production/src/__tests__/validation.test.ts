import { describe, expect, it } from "vitest";
import { uploadSpreadSchema, printOrderInputSchema, eAlbumSettingsSchema } from "../validation";

describe("uploadSpreadSchema", () => {
  it("accepts a valid spread upload", () => {
    expect(uploadSpreadSchema.safeParse({ spreadNumber: 1, fileKey: "albums/x/spread-1-v1.jpg" }).success).toBe(true);
  });
});

describe("printOrderInputSchema", () => {
  it("accepts print specification and lab details", () => {
    const result = printOrderInputSchema.safeParse({ copies: 2, printSpecification: { size: "12x12", binding: "leather" }, labName: "Pixel Labs", labContactEmail: "orders@pixellabs.test" });
    expect(result.success).toBe(true);
  });
});

describe("eAlbumSettingsSchema", () => {
  it("accepts a password and OTP toggle", () => {
    expect(eAlbumSettingsSchema.safeParse({ password: "secret1", otpRequired: true }).success).toBe(true);
  });
});
