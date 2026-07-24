import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { FrameCard } from "../../components/marketing/frame-card";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { KEY_SECTIONS } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Features",
  description: "Every part of a photography studio's workflow, from first enquiry to delivered album, in one platform.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Features", path: "/features" }])} />

      <Hero
        eyebrow="Frame 002 · Features"
        title="Every frame of your workflow, in one contact sheet."
        subtitle="From the first enquiry to the delivered album, BCP Studio OS replaces the spreadsheets, WhatsApp threads, and disconnected tools most studios stitch together by hand."
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <Eyebrow>All eleven, in detail</Eyebrow>
        <h2 className="mb-12 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">What&apos;s included</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_SECTIONS.map((section) => (
            <FrameCard
              key={section.slug}
              frameNumber={section.frameNumber}
              specTag={section.specTag}
              title={section.name}
              description={section.description}
            />
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
