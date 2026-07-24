import { describe, expect, it } from "vitest";
import { toRouteRateLimit, byEmailInBody } from "../plugins/rate-limit-auth";
import { AUTH_RATE_LIMITS } from "@bcp/auth";

describe("toRouteRateLimit", () => {
  it("converts seconds to milliseconds for @fastify/rate-limit's timeWindow", () => {
    const config = toRouteRateLimit(AUTH_RATE_LIMITS.loginPerAccount);
    expect(config.rateLimit.timeWindow).toBe(AUTH_RATE_LIMITS.loginPerAccount.timeWindowSeconds * 1000);
    expect(config.rateLimit.max).toBe(AUTH_RATE_LIMITS.loginPerAccount.max);
  });

  it("passes through an optional keyGenerator", () => {
    const config = toRouteRateLimit(AUTH_RATE_LIMITS.otpRequestPerAccount, byEmailInBody);
    expect(config.rateLimit.keyGenerator).toBe(byEmailInBody);
  });
});

describe("byEmailInBody", () => {
  it("keys by lowercased email when present", () => {
    const key = byEmailInBody({ body: { email: "Owner@Example.com" }, ip: "1.2.3.4" });
    expect(key).toBe("email:owner@example.com");
  });

  it("falls back to IP when there's no email", () => {
    const key = byEmailInBody({ body: {}, ip: "1.2.3.4" });
    expect(key).toBe("ip:1.2.3.4");
  });
});
