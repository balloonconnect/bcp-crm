import { describe, expect, it } from "vitest";
import { issueVerificationToken, validateVerificationToken } from "../verification-tokens";
import { hashOpaqueToken } from "../opaque-tokens";

describe("issueVerificationToken", () => {
  it("sets a shorter TTL for password_reset than email_verification", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const reset = issueVerificationToken("password_reset", now);
    const verify = issueVerificationToken("email_verification", now);
    expect(reset.expiresAt.getTime()).toBeLessThan(verify.expiresAt.getTime());
  });

  it("produces a tokenHash matching hashOpaqueToken(token)", () => {
    const { token, tokenHash } = issueVerificationToken("login_otp");
    expect(tokenHash).toBe(hashOpaqueToken(token));
  });
});

describe("validateVerificationToken", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("rejects when no record is found", () => {
    expect(validateVerificationToken(null, now)).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects an already-consumed token", () => {
    const result = validateVerificationToken(
      {
        tokenHash: "x",
        purpose: "email_verification",
        expiresAt: new Date(now.getTime() + 60_000),
        consumedAt: new Date(now.getTime() - 1000),
      },
      now,
    );
    expect(result).toEqual({ ok: false, reason: "already_used" });
  });

  it("rejects an expired token", () => {
    const result = validateVerificationToken(
      {
        tokenHash: "x",
        purpose: "password_reset",
        expiresAt: new Date(now.getTime() - 1000),
        consumedAt: null,
      },
      now,
    );
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts a fresh, unconsumed, unexpired token", () => {
    const result = validateVerificationToken(
      {
        tokenHash: "x",
        purpose: "login_otp",
        expiresAt: new Date(now.getTime() + 60_000),
        consumedAt: null,
      },
      now,
    );
    expect(result).toEqual({ ok: true });
  });
});
