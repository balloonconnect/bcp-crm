import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { getKeySection } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Album Selection",
  description: "Clients shortlist and arrange their favorite frames into an album online, with pricing calculated automatically before you go to print.",
  path: "/album-selection",
});

const albumSelection = getKeySection("album-selection");

export default function AlbumSelectionPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Album Selection", path: "/album-selection" }])} />

      <Hero
        eyebrow={`Frame 007 · ${albumSelection.name}`}
        title="From shortlist to print-ready, without an email thread."
        subtitle={albumSelection.description}
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-display text-3xl leading-tight">Clients do the picking; you get a clean brief</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Clients browse their gallery, shortlist favorites, and drag them into album page order — right from their
              phone. You receive a finished layout brief, not a scattered list of photo numbers in a WhatsApp message.
            </p>
          </div>
          <div>
            <Eyebrow>Pricing, handled</Eyebrow>
            <h2 className="font-display text-3xl leading-tight">Extra sheets price themselves</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Set a base page count and a per-extra-sheet rate once, and the selection tool calculates the final
              album price automatically as clients add photos beyond what&apos;s included — no manual recalculation before
              you send a final invoice.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
