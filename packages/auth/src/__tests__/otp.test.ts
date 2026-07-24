import { describe, expect, it } from "vitest";
import { generateEmailOtp, verifyEmailOtp } from "../otp";

describe("generateEmailOtp", () => {
  it("generates a 6-digit numeric code", () => {
    const { code } = generateEmailOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("pads codes below 100000 with leading zeros", () => {
    // run a bunch of times to increase the odds of hitting a low value
    const codes = Array.from({ length: 200 }, () => generateEmailOtp().code);
    for (const code of codes) {
      expect(code.length).toBe(6);
    }
  });
});

describe("verifyEmailOtp", () => {
  it("verifies a correct code against its hash", () => {
    const { code, codeHash } = generateEmailOtp();
    expect(verifyEmailOtp(code, codeHash)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const { codeHash } = generateEmailOtp();
    expect(verifyEmailOtp("000000", codeHash)).toBe(false);
  });
});
