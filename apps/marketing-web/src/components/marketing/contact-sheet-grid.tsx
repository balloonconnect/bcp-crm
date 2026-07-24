import Link from "next/link";
import type { Route } from "next";
import { KEY_SECTIONS } from "../../lib/content";

/**
 * The hero's signature element: a literal contact sheet — a grid of
 * "frames," each numbered like a roll of film, each linking to the
 * product page for that key section. This doubles as the hero's visual
 * anchor and a navigation shortcut, rather than a decorative stock
 * illustration.
 */
export function ContactSheetGrid() {
  const frames = KEY_SECTIONS.slice(0, 6);

  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-ink-soft/30 bg-ink p-1.5 sm:gap-2 sm:p-2" role="list" aria-label="Key product areas">
      {frames.map((frame) => (
        <Link
          key={frame.slug}
          href={frame.pageHref as Route}
          role="listitem"
          className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-sm border border-ink-soft/20 bg-charcoal p-2 transition-colors hover:border-safelight/60 sm:p-3"
        >
          <span className="font-mono text-[10px] text-ink-faint">{frame.frameNumber}</span>
          <span className="font-display text-xs leading-tight text-paper transition-colors group-hover:text-safelight sm:text-sm">
            {frame.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
