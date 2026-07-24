import { describe, expect, it } from "vitest";
import { computeUptimePercent } from "../uptime";
import { isSensitiveFieldName, NEVER_LOG_PATHS } from "../redaction";
import { generateRequestId } from "../request-context";

describe("computeUptimePercent", () => {
  it("returns 100 for an empty window rather than dividing by zero", () => {
    expect(computeUptimePercent([])).toBe(100);
  });

  it("computes the percentage of healthy checks", () => {
    expect(computeUptimePercent([{ status: "healthy" }, { status: "healthy" }, { status: "healthy" }, { status: "unhealthy" }])).toBe(75);
  });

  it("counts degraded as down, not up", () => {
    expect(computeUptimePercent([{ status: "healthy" }, { status: "degraded" }])).toBe(50);
  });
});

describe("isSensitiveFieldName", () => {
  it("flags every category named in the brief", () => {
    expect(isSensitiveFieldName("password")).toBe(true);
    expect(isSensitiveFieldName("otpCode")).toBe(true);
    expect(isSensitiveFieldName("accessToken")).toBe(true);
    expect(isSensitiveFieldName("gatewaySecret")).toBe(true);
    expect(isSensitiveFieldName("signedUrl")).toBe(true);
  });

  it("does not flag an ordinary, non-sensitive field", () => {
    expect(isSensitiveFieldName("clientName")).toBe(false);
  });
});

describe("NEVER_LOG_PATHS", () => {
  it("covers all five categories named in the brief", () => {
    const joined = NEVER_LOG_PATHS.join(" ").toLowerCase();
    expect(joined).toContain("password");
    expect(joined).toContain("otp");
    expect(joined).toContain("token");
    expect(joined).toContain("secret");
    expect(joined).toContain("url");
  });
});

describe("generateRequestId", () => {
  it("generates a unique, prefixed ID each call", () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^req_/);
  });
});
