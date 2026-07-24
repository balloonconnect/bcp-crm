import { describe, expect, it } from "vitest";
import {
  computeOneYearExpiry,
  computeGraceEndDate,
  resolveEffectiveStatus,
  isLicenseUsable,
  canRenew,
} from "../license-lifecycle";

describe("computeOneYearExpiry", () => {
  it("is exactly 365 days after the start date", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const expiry = computeOneYearExpiry(start);
    const diffDays = (expiry.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(365);
  });
});

describe("computeGraceEndDate", () => {
  it("defaults to a 14-day grace period", () => {
    const expiresAt = new Date("2026-01-01T00:00:00Z");
    const graceEnd = computeGraceEndDate(expiresAt);
    const diffDays = (graceEnd.getTime() - expiresAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(14);
  });
});

describe("resolveEffectiveStatus", () => {
  const expiresAt = new Date("2026-06-01T00:00:00Z");

  it("is active before expiry", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    expect(resolveEffectiveStatus({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe("active");
  });

  it("is grace just after expiry", () => {
    const now = new Date("2026-06-05T00:00:00Z");
    expect(resolveEffectiveStatus({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe("grace");
  });

  it("is expired once the grace period has also passed", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    expect(resolveEffectiveStatus({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe("expired");
  });

  it("revoked always wins regardless of dates", () => {
    const now = new Date("2026-01-01T00:00:00Z"); // well before expiry
    expect(resolveEffectiveStatus({ status: "revoked", expiresAt, graceEndsAt: null }, now)).toBe("revoked");
  });

  it("suspended always wins regardless of dates", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(resolveEffectiveStatus({ status: "suspended", expiresAt, graceEndsAt: null }, now)).toBe("suspended");
  });
});

describe("isLicenseUsable", () => {
  const expiresAt = new Date("2026-06-01T00:00:00Z");

  it("is usable while active", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    expect(isLicenseUsable({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe(true);
  });

  it("is usable during grace", () => {
    const now = new Date("2026-06-05T00:00:00Z");
    expect(isLicenseUsable({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe(true);
  });

  it("is not usable once expired", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    expect(isLicenseUsable({ status: "active", expiresAt, graceEndsAt: null }, now)).toBe(false);
  });

  it("is never usable when revoked", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(isLicenseUsable({ status: "revoked", expiresAt, graceEndsAt: null }, now)).toBe(false);
  });
});

describe("canRenew", () => {
  it("cannot renew a revoked license", () => {
    const expiresAt = new Date("2026-06-01T00:00:00Z");
    expect(canRenew({ status: "revoked", expiresAt, graceEndsAt: null }, new Date("2026-01-01"))).toBe(false);
  });

  it("can renew during grace", () => {
    const expiresAt = new Date("2026-06-01T00:00:00Z");
    expect(canRenew({ status: "active", expiresAt, graceEndsAt: null }, new Date("2026-06-05"))).toBe(true);
  });

  it("can renew within 60 days of expiry", () => {
    const expiresAt = new Date("2026-06-01T00:00:00Z");
    expect(canRenew({ status: "active", expiresAt, graceEndsAt: null }, new Date("2026-04-15"))).toBe(true);
  });

  it("cannot renew far ahead of expiry", () => {
    const expiresAt = new Date("2026-06-01T00:00:00Z");
    expect(canRenew({ status: "active", expiresAt, graceEndsAt: null }, new Date("2026-01-01"))).toBe(false);
  });
});
