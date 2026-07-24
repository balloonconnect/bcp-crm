import { Quote } from "lucide-react";
import { TESTIMONIAL_PLACEHOLDERS } from "../../lib/content";

/**
 * Explicitly labeled placeholders, not fabricated quotes — each card
 * shows what kind of studio the slot is reserved for so real testimonials
 * can be dropped in later without guessing what mix was intended.
 */
export function TestimonialPlaceholders() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {TESTIMONIAL_PLACEHOLDERS.map((testimonial, index) => (
        <div key={index} className="flex flex-col gap-4 rounded-lg border border-dashed border-ink-soft/30 bg-paper-dim p-6">
          <Quote className="h-6 w-6 text-safelight-dim" aria-hidden="true" />
          <p className="text-sm italic leading-relaxed text-ink-soft">{testimonial.quotePlaceholder}</p>
          <div className="mt-auto">
            <p className="text-sm font-medium text-ink">{testimonial.namePlaceholder}</p>
            <p className="text-xs text-ink-soft">{testimonial.rolePlaceholder}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
