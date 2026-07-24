import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { LeadForm } from "../../components/marketing/lead-form";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Book a Demo",
  description: "See BCP Studio OS walked through against your own studio's workflow — CRM, galleries, AI face search, and album selection.",
  path: "/book-demo",
});

export default function BookDemoPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Book a demo", path: "/book-demo" }])} />

      <Hero
        eyebrow="Frame 013 · Book a demo"
        title="See it against your own studio's workflow."
        subtitle="30 minutes, no slides — we'll walk through CRM, galleries, AI face search, and album selection using an example that matches how your studio actually books shoots."
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>What to expect</Eyebrow>
            <ul className="mt-4 flex flex-col gap-4 text-sm text-ink-soft">
              <li>— A live walkthrough of the CRM pipeline, galleries, and album selection tool</li>
              <li>— Time to ask about migrating your existing client list and bookings</li>
              <li>— A clear answer on which plan fits your studio&apos;s size, with no pressure to decide on the call</li>
            </ul>
          </div>
          <LeadForm type="demo_request" submitLabel="Request a demo" showPreferredTime />
        </div>
      </Section>
    </>
  );
}
