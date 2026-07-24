import { describe, expect, it } from "vitest";
import { generateRecoveryCodes, matchRecoveryCode } from "../recovery-codes";

describe("generateRecoveryCodes", () => {
  it("generates 10 codes by default, all unique", () => {
    const codes = generateRecoveryCodes();
    expect(codes.length).toBe(10);
    expect(new Set(codes.map((c) => c.code)).size).toBe(10);
  });

  it("formats codes as XXXX-XXXX", () => {
    const [first] = generateRecoveryCodes(1);
    if (!first) throw new Error("expected a code");
    expect(first.code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
  });
});

describe("matchRecoveryCode", () => {
  it("matches an unused code", () => {
    const first = generateRecoveryCodes(1)[0];
    if (!first) throw new Error("expected a code");
    const { code, codeHash } = first;
    const match = matchRecoveryCode(code, [{ codeHash, usedAt: null }]);
    expect(match).not.toBeNull();
  });

  it("does not match an already-used code", () => {
    const first = generateRecoveryCodes(1)[0];
    if (!first) throw new Error("expected a code");
    const { code, codeHash } = first;
    const match = matchRecoveryCode(code, [{ codeHash, usedAt: new Date() }]);
    expect(match).toBeNull();
  });

  it("does not match a code that was never issued", () => {
    const issued = generateRecoveryCodes(1)[0];
    if (!issued) throw new Error("expected a code");
    const match = matchRecoveryCode("ZZZZ-ZZZZ", [{ codeHash: issued.codeHash, usedAt: null }]);
    expect(match).toBeNull();
  });

  it("is case-insensitive on the presented code", () => {
    const first = generateRecoveryCodes(1)[0];
    if (!first) throw new Error("expected a code");
    const { code, codeHash } = first;
    const match = matchRecoveryCode(code.toLowerCase(), [{ codeHash, usedAt: null }]);
    expect(match).not.toBeNull();
  });
});
