import { describe, expect, it } from "vitest";
import { generateCsrfToken, verifyCsrfToken } from "../csrf";

describe("generateCsrfToken", () => {
  it("generates a high-entropy hex token", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates a different token each call", () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});

describe("verifyCsrfToken", () => {
  it("accepts matching cookie and header values", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it("rejects a mismatched header", () => {
    expect(verifyCsrfToken(generateCsrfToken(), generateCsrfToken())).toBe(false);
  });

  it("rejects when either value is missing", () => {
    expect(verifyCsrfToken(undefined, generateCsrfToken())).toBe(false);
    expect(verifyCsrfToken(generateCsrfToken(), undefined)).toBe(false);
  });
});
