import { describe, expect, it } from "vitest";
import { checkGalleryAccess, isOtpValid } from "../access";

describe("checkGalleryAccess", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  it("grants access to an open gallery", () => {
    expect(checkGalleryAccess({ expiresAt: null, passwordHash: null, otpRequired: false }, null, now)).toBe("granted");
  });

  it("expiry wins even with a valid session", () => {
    const config = { expiresAt: new Date("2026-07-01"), passwordHash: "hash", otpRequired: false };
    expect(checkGalleryAccess(config, { passwordVerified: true, otpVerified: true }, now)).toBe("expired");
  });

  it("requires a password when set and not yet verified", () => {
    const config = { expiresAt: null, passwordHash: "hash", otpRequired: false };
    expect(checkGalleryAccess(config, null, now)).toBe("needs_password");
  });

  it("requires OTP after password is verified", () => {
    const config = { expiresAt: null, passwordHash: "hash", otpRequired: true };
    expect(checkGalleryAccess(config, { passwordVerified: true, otpVerified: false }, now)).toBe("needs_otp");
  });

  it("grants access once both password and OTP are verified", () => {
    const config = { expiresAt: null, passwordHash: "hash", otpRequired: true };
    expect(checkGalleryAccess(config, { passwordVerified: true, otpVerified: true }, now)).toBe("granted");
  });
});

describe("isOtpValid", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  it("validates a matching, unexpired code", () => {
    expect(isOtpValid("123456", new Date("2026-07-18T00:10:00Z"), "123456", now)).toBe(true);
  });

  it("rejects a mismatched code", () => {
    expect(isOtpValid("123456", new Date("2026-07-18T00:10:00Z"), "999999", now)).toBe(false);
  });

  it("rejects an expired code", () => {
    expect(isOtpValid("123456", new Date("2026-07-17T00:00:00Z"), "123456", now)).toBe(false);
  });
});
