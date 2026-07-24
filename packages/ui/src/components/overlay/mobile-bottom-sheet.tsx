"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../primitives/sheet";

export interface MobileBottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Unlike ResponsiveDrawer (which repositions by breakpoint), this always
 * anchors to the bottom — for action sheets and quick-pickers that are
 * conceptually "attached" to the control that opened them (e.g. tapping a
 * lead's status chip to change it), regardless of screen size.
 */
export function MobileBottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: MobileBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="bottom" className={cn("mx-auto w-full sm:max-w-lg", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-2">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
