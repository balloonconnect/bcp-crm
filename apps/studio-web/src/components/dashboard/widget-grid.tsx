"use client";

import * as React from "react";
import { useDashboard } from "../../lib/dashboard-context";
import { WidgetCard } from "./widget-card";
import { WidgetContent } from "./widgets/widget-content";

/**
 * Responsive by breakpoint, not by widget size: every widget is a
 * uniform card, and the grid itself gains columns as the viewport
 * grows — one column on mobile (the layout's saved order doubles as
 * mobile's priority order), two on tablet, three on desktop, four on
 * large desktop. Order is applied via the CSS `order` property so
 * reordering doesn't require re-mounting or physically moving DOM
 * nodes — cheap during drag.
 */
export function WidgetGrid() {
  const { summary, layout, customizing, reorder } = useDashboard();
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  if (!summary) return null;

  const visible = layout.filter((item) => item.visible);

  function handleDrop() {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      // indices here are positions within the *visible* list; map back to the full layout's indices.
      const fromKey = visible[dragIndex]!.key;
      const toKey = visible[overIndex]!.key;
      const fullFrom = layout.findIndex((item) => item.key === fromKey);
      const fullTo = layout.findIndex((item) => item.key === toKey);
      reorder(fullFrom, fullTo);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((item, index) => (
        <div key={item.key} style={{ order: index }}>
          <WidgetCard widgetKey={item.key} index={index} onDragStart={setDragIndex} onDragOver={setOverIndex} onDrop={handleDrop}>
            <WidgetContent widgetKey={item.key} data={(summary as Record<string, unknown>)[item.key]} />
          </WidgetCard>
        </div>
      ))}
      {customizing && layout.some((item) => !item.visible) && (
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
          <HiddenWidgetsPanel />
        </div>
      )}
    </div>
  );
}

function HiddenWidgetsPanel() {
  const { layout, toggleWidget } = useDashboard();
  const hidden = layout.filter((item) => !item.visible);

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">Hidden widgets</p>
      <div className="flex flex-wrap gap-2">
        {hidden.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggleWidget(item.key)}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            + {item.key.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
