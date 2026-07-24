import { describe, expect, it } from "vitest";
import { needsSslRenewal, isSslExpired, canActivate, nextSslStatusAfterVerification } from "../ssl-status";

describe("needsSslRenewal", () => {
  it("is false when there's no expiry set", () => {
    expect(needsSslRenewal(null)).toBe(false);
  });

  it("is false well before expiry", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresFarOut = new Date("2026-06-01T00:00:00Z");
    expect(needsSslRenewal(expiresFarOut, now)).toBe(false);
  });

  it("is true within the renewal window", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresSoon = new Date("2026-01-10T00:00:00Z"); // within 14 days
    expect(needsSslRenewal(expiresSoon, now)).toBe(true);
  });
});

describe("isSslExpired", () => {
  it("is true once past the expiry date", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const expired = new Date("2026-01-01T00:00:00Z");
    expect(isSslExpired(expired, now)).toBe(true);
  });

  it("is false before expiry", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const future = new Date("2026-06-01T00:00:00Z");
    expect(isSslExpired(future, now)).toBe(false);
  });
});

describe("canActivate", () => {
  it("requires both verification and issued SSL", () => {
    expect(canActivate({ verified: true, sslStatus: "issued" })).toBe(true);
    expect(canActivate({ verified: true, sslStatus: "pending" })).toBe(false);
    expect(canActivate({ verified: false, sslStatus: "issued" })).toBe(false);
  });
});

describe("nextSslStatusAfterVerification", () => {
  it("moves from none to pending once verified", () => {
    expect(nextSslStatusAfterVerification({ currentStatus: "none", verified: true })).toBe("pending");
  });

  it("leaves status unchanged if not yet verified", () => {
    expect(nextSslStatusAfterVerification({ currentStatus: "none", verified: false })).toBe("none");
  });

  it("does not regress an already-issued certificate", () => {
    expect(nextSslStatusAfterVerification({ currentStatus: "issued", verified: true })).toBe("issued");
  });
});
