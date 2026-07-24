import { describe, expect, it } from "vitest";
import { isApexDomain, generateDnsInstructions } from "../dns-instructions";

const PLATFORM_CONFIG = { cnameTarget: "domains.bcpstudio.os", apexIpAddresses: ["203.0.113.10", "203.0.113.11"] };

describe("isApexDomain", () => {
  it("treats a two-label domain as apex", () => {
    expect(isApexDomain("example.com")).toBe(true);
  });

  it("treats a subdomain as non-apex", () => {
    expect(isApexDomain("portal.example.com")).toBe(false);
  });
});

describe("generateDnsInstructions", () => {
  it("always includes a TXT verification record", () => {
    const instructions = generateDnsInstructions("portal.example.com", "verify-token-123", PLATFORM_CONFIG);
    expect(instructions.verificationRecord.type).toBe("TXT");
    expect(instructions.verificationRecord.value).toBe("verify-token-123");
  });

  it("uses a CNAME routing record for a subdomain", () => {
    const instructions = generateDnsInstructions("portal.example.com", "token", PLATFORM_CONFIG);
    expect(instructions.isApex).toBe(false);
    expect(instructions.routingRecords).toHaveLength(1);
    expect(instructions.routingRecords[0]).toMatchObject({ type: "CNAME", value: "domains.bcpstudio.os" });
  });

  it("uses A records for an apex domain, one per configured IP", () => {
    const instructions = generateDnsInstructions("example.com", "token", PLATFORM_CONFIG);
    expect(instructions.isApex).toBe(true);
    expect(instructions.routingRecords).toHaveLength(2);
    expect(instructions.routingRecords.every((r) => r.type === "A")).toBe(true);
    expect(instructions.routingRecords.map((r) => r.value)).toEqual(PLATFORM_CONFIG.apexIpAddresses);
  });

  it("supports a custom verification label", () => {
    const instructions = generateDnsInstructions("example.com", "token", {
      ...PLATFORM_CONFIG,
      verificationLabel: "_custom-verify",
    });
    expect(instructions.verificationRecord.name).toBe("_custom-verify.example.com");
  });
});
