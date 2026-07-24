"use client";

import * as React from "react";
import { useIsBreakpoint } from "../../hooks/use-breakpoint";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../primitives/sheet";

export interface ResponsiveDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Desktop/tablet side. Ignored below `sm`, where it's always a bottom sheet. */
  side?: "left" | "right";
}

/**
 * Used for secondary panels that aren't full navigation (e.g. a filter
 * builder, a lead detail quick-view). Slides in from the side at `sm`+;
 * becomes a bottom sheet below that so the affordance always tracks the
 * user's thumb rather than requiring a reach to a screen edge.
 */
export function ResponsiveDrawer({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  side = "right",
}: ResponsiveDrawerProps) {
  const isTabletUp = useIsBreakpoint("sm");
  const resolvedSide = isTabletUp ? side : "bottom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side={resolvedSide} className={resolvedSide === "bottom" ? "w-full" : "w-[420px] max-w-[90vw]"}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
