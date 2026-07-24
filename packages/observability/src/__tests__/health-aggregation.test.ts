import { describe, expect, it } from "vitest";
import { aggregateOverallHealth, evaluateAlertCondition } from "../health-aggregation";

describe("aggregateOverallHealth", () => {
  it("is healthy only when every service is healthy", () => {
    expect(aggregateOverallHealth([{ service: "api", status: "healthy" }, { service: "database", status: "healthy" }])).toBe("healthy");
  });

  it("is degraded when the worst service is degraded", () => {
    expect(aggregateOverallHealth([{ service: "api", status: "healthy" }, { service: "redis", status: "degraded" }])).toBe("degraded");
  });

  it("is unhealthy when any service is unhealthy, even if others are healthy", () => {
    expect(aggregateOverallHealth([{ service: "api", status: "healthy" }, { service: "database", status: "unhealthy" }, { service: "redis", status: "degraded" }])).toBe("unhealthy");
  });
});

describe("evaluateAlertCondition", () => {
  const at = (status: "healthy" | "degraded" | "unhealthy") => ({ status, checkedAt: new Date() });

  it("does not fire without enough history yet", () => {
    expect(evaluateAlertCondition([at("unhealthy")], "unhealthy", 2)).toBe(false);
  });

  it("fires once the required number of consecutive checks all meet the trigger status", () => {
    expect(evaluateAlertCondition([at("unhealthy"), at("unhealthy")], "unhealthy", 2)).toBe(true);
  });

  it("does not fire if a recent check recovered, even if an older one was bad", () => {
    expect(evaluateAlertCondition([at("healthy"), at("unhealthy")], "unhealthy", 2)).toBe(false);
  });

  it("treats a worse status than the trigger as still satisfying the condition", () => {
    expect(evaluateAlertCondition([at("unhealthy"), at("unhealthy")], "degraded", 2)).toBe(true);
  });
});
