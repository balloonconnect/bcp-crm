import { ChevronDown } from "lucide-react";
import type { FaqItem } from "../../lib/content";

/** Native <details>/<summary> — keyboard and screen-reader accessible with zero JS, and progressively enhanced by the browser's own disclosure semantics rather than a custom ARIA implementation. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-ink-soft/15">
      {items.map((item) => (
        <details key={item.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-display text-lg text-ink marker:content-none">
            {item.question}
            <ChevronDown className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
