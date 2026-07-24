import { describe, expect, it } from "vitest";
import { WIDGET_REGISTRY, TOTAL_WIDGETS, getWidgetDefinition, WIDGET_KEYS } from "../widgets";

describe("WIDGET_REGISTRY", () => {
  it("has exactly the 19 widgets named in the brief", () => {
    expect(TOTAL_WIDGETS).toBe(19);
    expect(WIDGET_REGISTRY.length).toBe(19);
  });

  it("has unique keys and unique default orders", () => {
    expect(new Set(WIDGET_KEYS).size).toBe(19);
    const orders = WIDGET_REGISTRY.map((w) => w.defaultOrder);
    expect(new Set(orders).size).toBe(19);
  });

  it("getWidgetDefinition resolves a known widget", () => {
    expect(getWidgetDefinition("todays_shoots").title).toBe("Today's shoots");
  });

  it("getWidgetDefinition throws for an unknown widget", () => {
    expect(() => getWidgetDefinition("not_a_widget" as never)).toThrow();
  });
});
