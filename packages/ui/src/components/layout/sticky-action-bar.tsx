import * as React from "react";
import { cn } from "../../lib/cn";

export interface StickyActionBarProps {
  children: React.ReactNode;
  /** Adds bottom offset so the bar sits above MobileBottomNavigation instead of under it. */
  aboveMobileNav?: boolean;
  className?: string;
}

/**
 * Pins primary actions (Save, Send quotation, Confirm booking) to the
 * bottom of the viewport on narrow screens, where reaching a top-of-page
 * button after scrolling a long form is unreliable. Becomes an inline,
 * non-sticky bar at `lg`+ where the whole form usually fits without
 * scrolling past the fold.
 */
export function StickyActionBar({ children, aboveMobileNav = true, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "sticky z-sticky-chrome -mx-4 flex flex-col-reverse gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur pb-safe xs:flex-row xs:justify-end",
        "lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none",
        aboveMobileNav ? "bottom-16 sm:bottom-0" : "bottom-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
