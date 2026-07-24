import { describe, expect, it } from "vitest";
import { checkEAlbumAccess } from "../access";

describe("checkEAlbumAccess", () => {
  it("grants access with no password or OTP required", () => {
    expect(checkEAlbumAccess({ passwordHash: null, otpRequired: false }, null)).toBe("granted");
  });

  it("requires password first", () => {
    expect(checkEAlbumAccess({ passwordHash: "hash", otpRequired: true }, null)).toBe("needs_password");
  });

  it("requires OTP after password is verified", () => {
    expect(checkEAlbumAccess({ passwordHash: "hash", otpRequired: true }, { passwordVerified: true, otpVerified: false })).toBe("needs_otp");
  });

  it("grants access once both are verified", () => {
    expect(checkEAlbumAccess({ passwordHash: "hash", otpRequired: true }, { passwordVerified: true, otpVerified: true })).toBe("granted");
  });
});
