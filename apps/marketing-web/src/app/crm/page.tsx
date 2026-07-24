import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { FrameCard } from "../../components/marketing/frame-card";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { getKeySection } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "CRM",
  description: "One pipeline for leads, quotations, bookings, shoot schedules, and multi-branch reporting.",
  path: "/crm",
});

const crmSections = ["crm", "quotations-invoices", "event-management", "multi-branch"].map(getKeySection);

export default function CrmPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "CRM", path: "/crm" }])} />

      <Hero
        eyebrow="Frame 004 · CRM"
        title="Your studio's operations, developed in one roll."
        subtitle="From the first enquiry to a signed quotation to a scheduled shoot day — one pipeline, not four disconnected tools your team has to keep in sync by hand."
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {crmSections.map((section) => (
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

      <Section tone="ink">
        <Eyebrow tone="ink">Built for how studios actually work</Eyebrow>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <h3 className="font-display text-2xl">Every enquiry, tracked</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              Leads capture from your website, WhatsApp, or manual entry, and stay visible until they convert or close.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Quotes clients accept online</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              Branded, GST-ready quotations with a service checklist your client can review and accept without a phone call.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">One calendar, every branch</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              Shoot schedules, team assignments, and equipment checklists roll up across every location you run.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
