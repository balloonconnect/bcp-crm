import { describe, expect, it } from "vitest";
import { COPILOT_TOOLS, getToolDefinition, getToolsForPhase } from "../tool-registry";

describe("COPILOT_TOOLS", () => {
  it("has one tool per example query named in the brief", () => {
    expect(COPILOT_TOOLS.length).toBeGreaterThanOrEqual(11);
  });

  it("no tool's input schema accepts a studioId — cross-tenant context is structurally impossible", () => {
    for (const tool of COPILOT_TOOLS) {
      const schema = tool.inputSchema as { properties?: Record<string, unknown> };
      expect(schema.properties?.studioId).toBeUndefined();
    }
  });

  it("write tools declare whether they're reversible", () => {
    const writeTools = COPILOT_TOOLS.filter((t) => t.kind === "write");
    expect(writeTools.length).toBeGreaterThan(0);
    for (const tool of writeTools) expect(typeof tool.isReversible).toBe("boolean");
  });
});

describe("getToolDefinition", () => {
  it("finds a tool by name", () => {
    expect(getToolDefinition("list_events")?.kind).toBe("read");
  });

  it("returns undefined for an unknown tool", () => {
    expect(getToolDefinition("delete_everything")).toBeUndefined();
  });
});

describe("getToolsForPhase", () => {
  it("phase 1 only includes read tools", () => {
    const tools = getToolsForPhase(1);
    expect(tools.every((t) => t.kind === "read")).toBe(true);
  });

  it("phase 3 includes write tools introduced at phase 2 and 3", () => {
    const tools = getToolsForPhase(3);
    expect(tools.some((t) => t.name === "create_quotation")).toBe(true);
    expect(tools.some((t) => t.name === "create_shot_list")).toBe(true);
  });
});
