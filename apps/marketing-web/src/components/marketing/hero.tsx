import { Button } from "@bcp/ui";
import { Eyebrow } from "./section";

export interface HeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  visual?: React.ReactNode;
}

/** Every non-home page's top band — same structure as the home hero (eyebrow, display headline, subtitle, optional CTAs) but without the contact-sheet visual, so product pages stay focused on their own content below. */
export function Hero({ eyebrow, title, subtitle, primaryCta, secondaryCta, visual }: HeroProps) {
  return (
    <div className="bg-ink px-4 pb-16 pt-14 text-paper sm:px-6 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Eyebrow tone="ink">{eyebrow}</Eyebrow>
          <h1 className="font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-faint">{subtitle}</p>
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col gap-3 xs:flex-row">
              {primaryCta && (
                <Button asChild size="lg" className="bg-safelight text-ink hover:bg-safelight/90">
                  <a href={primaryCta.href}>{primaryCta.label}</a>
                </Button>
              )}
              {secondaryCta && (
                <Button asChild size="lg" variant="outline" className="border-ink-soft/40 text-paper hover:bg-charcoal">
                  <a href={secondaryCta.href}>{secondaryCta.label}</a>
                </Button>
              )}
            </div>
          )}
        </div>
        {visual && <div>{visual}</div>}
      </div>
    </div>
  );
}
