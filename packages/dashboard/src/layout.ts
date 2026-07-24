import { z } from "zod";
import { WIDGET_REGISTRY, WIDGET_KEYS, type WidgetKey } from "./widgets";

export interface LayoutItem {
  key: WidgetKey;
  visible: boolean;
}

export type DashboardLayout = LayoutItem[];

export const layoutItemSchema = z.object({
  key: z.enum(WIDGET_KEYS as [WidgetKey, ...WidgetKey[]]),
  visible: z.boolean(),
});

/** What `DashboardPreference.layout` is validated against on the way in and out — an array covering every widget exactly once, order given by array position. */
export const dashboardLayoutSchema = z.array(layoutItemSchema).superRefine((layout, ctx) => {
  const keys = layout.map((item) => item.key);
  const missing = WIDGET_KEYS.filter((key) => !keys.includes(key));
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (missing.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Layout is missing widgets: ${missing.join(", ")}` });
  }
  if (duplicates.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Layout has duplicate widgets: ${[...new Set(duplicates)].join(", ")}` });
  }
});

/** Every widget, visible, in the registry's default order — what a new StudioUser sees before customizing anything. */
export function defaultLayout(): DashboardLayout {
  return [...WIDGET_REGISTRY].sort((a, b) => a.defaultOrder - b.defaultOrder).map((widget) => ({ key: widget.key, visible: true }));
}

/**
 * Repairs a layout against the current widget registry — drops widgets
 * that no longer exist (a widget removed in a future release), appends
 * any new widgets the registry has gained since a person last saved
 * their layout (visible by default, appended at the end so a newly
 * shipped widget doesn't silently jump ahead of someone's customized
 * order). Called on every layout read, not just when validation fails.
 */
export function reconcileLayout(layout: DashboardLayout): DashboardLayout {
  const known = layout.filter((item) => (WIDGET_KEYS as string[]).includes(item.key));
  const presentKeys = new Set(known.map((item) => item.key));
  const missingWidgets = WIDGET_KEYS.filter((key) => !presentKeys.has(key)).map((key) => ({ key, visible: true }));
  return [...known, ...missingWidgets];
}

export function toggleWidgetVisibility(layout: DashboardLayout, key: WidgetKey): DashboardLayout {
  return layout.map((item) => (item.key === key ? { ...item, visible: !item.visible } : item));
}

/** Moves the widget at `fromIndex` to `toIndex` — the shared primitive behind both desktop drag-and-drop and mobile's up/down reorder controls, so both interactions produce identical results. */
export function moveWidget(layout: DashboardLayout, fromIndex: number, toIndex: number): DashboardLayout {
  if (fromIndex < 0 || fromIndex >= layout.length || toIndex < 0 || toIndex >= layout.length) return layout;
  const next = [...layout];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next;
}

export function moveWidgetUp(layout: DashboardLayout, key: WidgetKey): DashboardLayout {
  const index = layout.findIndex((item) => item.key === key);
  return index <= 0 ? layout : moveWidget(layout, index, index - 1);
}

export function moveWidgetDown(layout: DashboardLayout, key: WidgetKey): DashboardLayout {
  const index = layout.findIndex((item) => item.key === key);
  return index === -1 || index >= layout.length - 1 ? layout : moveWidget(layout, index, index + 1);
}
