import { cn } from "@bcp/ui";
import { SpecTag } from "./spec-tag";

export interface FrameCardProps {
  frameNumber: string;
  specTag: string;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

/**
 * The site's signature element: every feature is presented as a frame on
 * a contact sheet — a sprocket-hole edge down the left, a frame number
 * in the corner (like a film roll's printed frame counter), and an
 * exposure-style spec tag. Used consistently across the home page grid
 * and every product page's feature list, so the motif reads as one
 * system rather than a one-off hero decoration.
 */
export function FrameCard({ frameNumber, specTag, title, description, className }: FrameCardProps) {
  return (
    <div className={cn("group relative flex flex-col gap-3 rounded-md border border-ink-soft/20 bg-charcoal p-6 pl-8", className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-sprockets bg-[length:100%_22px] text-ink-soft/30" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink-faint">{frameNumber}</span>
        <SpecTag>{specTag}</SpecTag>
      </div>
      <h3 className="font-display text-xl text-paper">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-faint">{description}</p>
    </div>
  );
}
