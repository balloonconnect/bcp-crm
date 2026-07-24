"use client";

import * as React from "react";
import { GripVertical, ChevronUp, ChevronDown, EyeOff } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@bcp/ui";
import { getWidgetDefinition, type WidgetKey } from "@bcp/dashboard";
import { useDashboard } from "../../lib/dashboard-context";

export interface WidgetCardProps {
  widgetKey: WidgetKey;
  index: number;
  children: React.ReactNode;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: () => void;
}

/**
 * The shell every widget renders inside: title/description from the
 * registry, and — only while `customizing` — a drag handle (desktop,
 * native HTML5 drag-and-drop, no extra dependency needed for reordering
 * a flat grid) plus up/down/hide controls that work identically on
 * touch, so mobile customization doesn't depend on drag gestures at all.
 */
export function WidgetCard({ widgetKey, index, children, onDragStart, onDragOver, onDrop }: WidgetCardProps) {
  const { customizing, toggleWidget, reorderUp, reorderDown } = useDashboard();
  const definition = getWidgetDefinition(widgetKey);

  return (
    <Card
      draggable={customizing}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => {
        if (!customizing) return;
        e.preventDefault();
        onDragOver?.(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      className={cn("flex flex-col", customizing && "cursor-grab border-dashed active:cursor-grabbing")}
    >
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{definition.title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{definition.description}</p>
        </div>
        {customizing && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label={`Move ${definition.title} up`} onClick={() => reorderUp(widgetKey)}>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label={`Move ${definition.title} down`} onClick={() => reorderDown(widgetKey)}>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="hidden h-8 w-8 lg:flex" aria-label={`Drag to reorder ${definition.title}`}>
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Hide ${definition.title}`} onClick={() => toggleWidget(widgetKey)}>
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-0">{children}</CardContent>
    </Card>
  );
}
