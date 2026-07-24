import { describe, expect, it } from "vitest";
import { isSuspiciousLogin } from "../suspicious-login";

describe("isSuspiciousLogin", () => {
  it("is not suspicious for a first-ever login", () => {
    expect(isSuspiciousLogin("1.2.3.4", "Chrome", [])).toBe(false);
  });

  it("is not suspicious when the IP matches a recent session, even with a new user agent", () => {
    expect(isSuspiciousLogin("1.2.3.4", "New Browser", [{ ipAddress: "1.2.3.4", userAgent: "Old Browser" }])).toBe(false);
  });

  it("is not suspicious when the user agent matches, even with a new IP (a traveling user)", () => {
    expect(isSuspiciousLogin("9.9.9.9", "Chrome", [{ ipAddress: "1.2.3.4", userAgent: "Chrome" }])).toBe(false);
  });

  it("is suspicious when neither the IP nor the user agent matches any recent session", () => {
    expect(isSuspiciousLogin("9.9.9.9", "Unknown Browser", [{ ipAddress: "1.2.3.4", userAgent: "Chrome" }])).toBe(true);
  });
});
