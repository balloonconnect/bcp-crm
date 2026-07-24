import { describe, expect, it } from "vitest";
import { MONITORED_SERVICES, getServiceDefinition } from "../services-registry";

describe("MONITORED_SERVICES", () => {
  it("has all 8 services named in the brief", () => {
    expect(MONITORED_SERVICES).toHaveLength(8);
  });

  it("finds a service by key", () => {
    expect(getServiceDefinition("database")?.checkKind).toBe("live_ping");
  });

  it("distinguishes services that can be live-pinged from ones only checkable as configured", () => {
    expect(getServiceDefinition("redis")?.checkKind).toBe("live_ping");
    expect(getServiceDefinition("ai_provider")?.checkKind).toBe("configuration_only");
  });
});
