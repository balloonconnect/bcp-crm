import { describe, expect, it } from "vitest";
import { galleryInputSchema, otpVerifySchema, commentInputSchema } from "../validation";

describe("galleryInputSchema", () => {
  it("accepts a minimal gallery", () => {
    expect(galleryInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully configured gallery", () => {
    const result = galleryInputSchema.safeParse({ title: "Sharma Wedding", layout: "story", password: "secret1", otpRequired: true, downloadLimitPerGuest: 10, watermarkEnabled: true, watermarkText: "© Studio" });
    expect(result.success).toBe(true);
  });
});

describe("otpVerifySchema", () => {
  it("requires exactly 6 digits", () => {
    expect(otpVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ code: "123" }).success).toBe(false);
  });
});

describe("commentInputSchema", () => {
  it("requires a guest name and body", () => {
    expect(commentInputSchema.safeParse({ guestName: "Asha", body: "Beautiful shot!" }).success).toBe(true);
    expect(commentInputSchema.safeParse({ body: "Beautiful shot!" }).success).toBe(false);
  });
});
