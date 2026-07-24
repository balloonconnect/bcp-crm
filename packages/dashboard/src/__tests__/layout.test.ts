import { describe, expect, it } from "vitest";
import {
  defaultLayout,
  reconcileLayout,
  toggleWidgetVisibility,
  moveWidget,
  moveWidgetUp,
  moveWidgetDown,
  dashboardLayoutSchema,
} from "../layout";
import { TOTAL_WIDGETS, WIDGET_KEYS } from "../widgets";

describe("defaultLayout", () => {
  it("includes every widget exactly once, all visible", () => {
    const layout = defaultLayout();
    expect(layout.length).toBe(TOTAL_WIDGETS);
    expect(layout.every((item) => item.visible)).toBe(true);
    expect(new Set(layout.map((i) => i.key)).size).toBe(TOTAL_WIDGETS);
  });

  it("orders todays_shoots before ai_recommendations", () => {
    const layout = defaultLayout();
    const shootsIndex = layout.findIndex((i) => i.key === "todays_shoots");
    const aiIndex = layout.findIndex((i) => i.key === "ai_recommendations");
    expect(shootsIndex).toBeLessThan(aiIndex);
  });

  it("passes its own schema validation", () => {
    expect(dashboardLayoutSchema.safeParse(defaultLayout()).success).toBe(true);
  });
});

describe("reconcileLayout", () => {
  it("drops unknown widgets and appends missing ones", () => {
    const stale = [{ key: "todays_shoots" as const, visible: true }, { key: "retired_widget" as never, visible: true }];
    const reconciled = reconcileLayout(stale);
    expect(reconciled.find((i) => (i.key as string) === "retired_widget")).toBeUndefined();
    expect(reconciled.length).toBe(TOTAL_WIDGETS);
    expect(new Set(reconciled.map((i) => i.key)).size).toBe(TOTAL_WIDGETS);
  });

  it("is idempotent on an already-complete layout", () => {
    const layout = defaultLayout();
    expect(reconcileLayout(layout)).toEqual(layout);
  });
});

describe("toggleWidgetVisibility", () => {
  it("flips only the targeted widget", () => {
    const layout = defaultLayout();
    const toggled = toggleWidgetVisibility(layout, "storage_usage");
    expect(toggled.find((i) => i.key === "storage_usage")?.visible).toBe(false);
    expect(toggled.find((i) => i.key === "todays_shoots")?.visible).toBe(true);
  });
});

describe("moveWidget / moveWidgetUp / moveWidgetDown", () => {
  it("moveWidget reorders by index", () => {
    const layout = defaultLayout();
    const moved = moveWidget(layout, 0, 2);
    expect(moved[2]!.key).toBe(layout[0]!.key);
  });

  it("moveWidgetUp is a no-op at the top", () => {
    const layout = defaultLayout();
    expect(moveWidgetUp(layout, layout[0]!.key)).toEqual(layout);
  });

  it("moveWidgetDown is a no-op at the bottom", () => {
    const layout = defaultLayout();
    const lastKey = layout[layout.length - 1]!.key;
    expect(moveWidgetDown(layout, lastKey)).toEqual(layout);
  });

  it("moveWidgetUp and moveWidgetDown are inverses", () => {
    const layout = defaultLayout();
    const key = layout[5]!.key;
    const moved = moveWidgetDown(layout, key);
    const restored = moveWidgetUp(moved, key);
    expect(restored).toEqual(layout);
  });
});

describe("dashboardLayoutSchema", () => {
  it("rejects a layout missing widgets", () => {
    const incomplete = [{ key: WIDGET_KEYS[0]!, visible: true }];
    expect(dashboardLayoutSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects a layout with duplicate widgets", () => {
    const layout = defaultLayout();
    const withDupe = [...layout, layout[0]!];
    expect(dashboardLayoutSchema.safeParse(withDupe).success).toBe(false);
  });
});
