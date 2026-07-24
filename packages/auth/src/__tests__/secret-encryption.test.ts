import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "../secret-encryption";

const KEY = "test-encryption-key-do-not-use-in-prod";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext secret", () => {
    const ciphertext = encryptSecret("JBSWY3DPEHPK3PXP", KEY);
    expect(decryptSecret(ciphertext, KEY)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptSecret("same-secret", KEY);
    const b = encryptSecret("same-secret", KEY);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong key", () => {
    const ciphertext = encryptSecret("JBSWY3DPEHPK3PXP", KEY);
    expect(() => decryptSecret(ciphertext, "a-completely-different-key")).toThrow();
  });

  it("rejects malformed ciphertext", () => {
    expect(() => decryptSecret("not-valid", KEY)).toThrow();
  });
});
