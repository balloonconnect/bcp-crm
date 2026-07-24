import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@bcp/ui";
import { Eyebrow, Section } from "../components/marketing/section";
import { ContactSheetGrid } from "../components/marketing/contact-sheet-grid";
import { FrameCard } from "../components/marketing/frame-card";
import { CtaBand } from "../components/marketing/cta-band";
import { TestimonialPlaceholders } from "../components/marketing/testimonial-placeholder";
import { JsonLd } from "../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../lib/seo";
import { KEY_SECTIONS, TRUST_STATS, SITE } from "../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Studio CRM, AI Photo Intelligence & Client Galleries",
  description: SITE.description,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />

      <div className="bg-ink px-4 pb-16 pt-14 text-paper sm:px-6 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Eyebrow tone="ink">Frame 001 · BCP Studio OS</Eyebrow>
            <h1 className="font-display text-4xl leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              Run Your Entire Photography Studio From One Platform.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-faint">
              CRM, AI face search, client galleries, album selection, WhatsApp automation, and your own white-label
              domain — replacing spreadsheets and scattered chats with one connected system. Zero commission, ever.
            </p>
            <div className="mt-8 flex flex-col gap-3 xs:flex-row">
              <Button asChild size="lg" className="bg-safelight text-ink hover:bg-safelight/90">
                <Link href="/register">Start free trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-ink-soft/40 text-paper hover:bg-charcoal">
                <Link href="/book-demo">Book a demo</Link>
              </Button>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-ink-soft/20 pt-6">
              {TRUST_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-2xl text-safelight sm:text-3xl">{stat.value}</dd>
                  <dd className="mt-1 text-xs text-ink-faint">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ContactSheetGrid />
        </div>
      </div>

      <Section tone="paper">
        <Eyebrow>The contact sheet</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          Eleven frames. One studio. Everything a photography business runs on, developed and printed in one place.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_SECTIONS.map((section) => (
            <FrameCard
              key={section.slug}
              frameNumber={section.frameNumber}
              specTag={section.specTag}
              title={section.name}
              description={section.tagline}
            />
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Why studios switch</Eyebrow>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <h3 className="font-display text-2xl">Zero commission, always</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              A flat subscription — never a cut of your bookings. What a client pays you is what you keep.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Your brand, your domain</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              CRM, client portal, and galleries under your own domain and logo. Clients never see BCP Studio OS.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Built for Indian studios</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              GST-ready invoices, UPI QR codes, and WhatsApp automation — not bolted-on afterthoughts.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="paper">
        <Eyebrow>From studios like yours</Eyebrow>
        <h2 className="mb-10 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">What studio owners say</h2>
        <TestimonialPlaceholders />
      </Section>

      <CtaBand />
    </>
  );
}
