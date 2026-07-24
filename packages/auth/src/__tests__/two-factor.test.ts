import { describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { generateTwoFactorSetup, verifyTwoFactorCode } from "../two-factor";

describe("generateTwoFactorSetup", () => {
  it("produces a secret, an otpauth URL, and a QR code data URL", async () => {
    const setup = await generateTwoFactorSetup("owner@balloonconnect.studio");
    expect(setup.secret.length).toBeGreaterThan(0);
    expect(setup.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe("verifyTwoFactorCode", () => {
  it("accepts a code generated from the same secret", async () => {
    const { secret } = await generateTwoFactorSetup("owner@balloonconnect.studio");
    const code = authenticator.generate(secret);
    expect(verifyTwoFactorCode(code, secret)).toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const { secret } = await generateTwoFactorSetup("owner@balloonconnect.studio");
    expect(verifyTwoFactorCode("000000", secret)).toBe(false);
  });

  it("rejects a malformed code without throwing", () => {
    expect(verifyTwoFactorCode("not-a-code", "JBSWY3DPEHPK3PXP")).toBe(false);
  });
});
