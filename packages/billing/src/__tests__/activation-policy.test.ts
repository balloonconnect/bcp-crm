import { describe, expect, it } from "vitest";
import { validateActivationAttempt } from "../activation-policy";

const BASE_LICENSE = {
  status: "active" as const,
  expiresAt: new Date("2027-01-01T00:00:00Z"),
  graceEndsAt: null,
  studioId: "studio-1",
  maxActivations: 2,
  allowedDomains: [] as string[],
};

const NOW = new Date("2026-06-01T00:00:00Z");

describe("validateActivationAttempt", () => {
  it("allows a normal activation within limits", () => {
    const result = validateActivationAttempt({
      license: BASE_LICENSE,
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-1",
      now: NOW,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("denies when the license is not usable (expired, no grace)", () => {
    const result = validateActivationAttempt({
      license: { ...BASE_LICENSE, expiresAt: new Date("2020-01-01T00:00:00Z") },
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-1",
      now: NOW,
    });
    expect(result).toEqual({ allowed: false, reason: "license_not_usable" });
  });

  it("denies when the requesting studio does not match the license's studio", () => {
    const result = validateActivationAttempt({
      license: BASE_LICENSE,
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-2",
      now: NOW,
    });
    expect(result).toEqual({ allowed: false, reason: "studio_mismatch" });
  });

  it("denies when maxActivations has been reached", () => {
    const result = validateActivationAttempt({
      license: BASE_LICENSE,
      currentActiveActivationCount: 2,
      requestingStudioId: "studio-1",
      now: NOW,
    });
    expect(result).toEqual({ allowed: false, reason: "max_activations_reached" });
  });

  it("allows when the requesting domain is in the allowed-domains list", () => {
    const result = validateActivationAttempt({
      license: { ...BASE_LICENSE, allowedDomains: ["studio.example.com"] },
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-1",
      requestingDomain: "Studio.Example.com",
      now: NOW,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("denies when the requesting domain is not in the allowed-domains list", () => {
    const result = validateActivationAttempt({
      license: { ...BASE_LICENSE, allowedDomains: ["studio.example.com"] },
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-1",
      requestingDomain: "other.example.com",
      now: NOW,
    });
    expect(result).toEqual({ allowed: false, reason: "domain_not_allowed" });
  });

  it("does not check domain restriction when the license has no allowed-domains configured", () => {
    const result = validateActivationAttempt({
      license: BASE_LICENSE, // allowedDomains: []
      currentActiveActivationCount: 0,
      requestingStudioId: "studio-1",
      requestingDomain: "anything.example.com",
      now: NOW,
    });
    expect(result).toEqual({ allowed: true });
  });
});
