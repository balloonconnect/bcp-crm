import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashOpaqueToken, safeCompare } from "../opaque-tokens";

describe("generateOpaqueToken", () => {
  it("generates unique, URL-safe tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("respects the requested byte length (base64url grows ~4/3)", () => {
    const short = generateOpaqueToken(8);
    const long = generateOpaqueToken(32);
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe("hashOpaqueToken", () => {
  it("is deterministic", () => {
    expect(hashOpaqueToken("hello")).toBe(hashOpaqueToken("hello"));
  });

  it("differs for different inputs", () => {
    expect(hashOpaqueToken("hello")).not.toBe(hashOpaqueToken("world"));
  });
});

describe("safeCompare", () => {
  it("returns true for equal strings", () => {
    expect(safeCompare("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings, including different lengths", () => {
    expect(safeCompare("abc123", "abc124")).toBe(false);
    expect(safeCompare("abc", "abcdef")).toBe(false);
  });
});
