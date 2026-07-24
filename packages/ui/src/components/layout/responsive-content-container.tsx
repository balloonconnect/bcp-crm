import * as React from "react";
import { cn } from "../../lib/cn";

export interface ResponsiveContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caps line/content width on large desktop so text doesn't stretch edge to edge. */
  maxWidth?: "default" | "narrow" | "wide" | "none";
}

const maxWidthClass: Record<NonNullable<ResponsiveContentContainerProps["maxWidth"]>, string> = {
  default: "xl:max-w-[1200px]",
  narrow: "xl:max-w-[760px]",
  wide: "xl:max-w-[1440px]",
  none: "",
};

/**
 * Standard page body wrapper. Padding scales with the breakpoint scale
 * (tighter on small mobile, generous on large desktop) and horizontal
 * scrolling is never introduced by this container — children that need
 * an intentional horizontal scroller (e.g. ResponsiveFilterBar's chip row)
 * opt in themselves with `scrollbar-none` + `overflow-x-auto`.
 */
export function ResponsiveContentContainer({
  className,
  maxWidth = "default",
  children,
  ...props
}: ResponsiveContentContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-4 xs:px-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8",
        maxWidthClass[maxWidth],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
