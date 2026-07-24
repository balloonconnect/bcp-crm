import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Section } from "../../components/marketing/section";
import { LeadForm } from "../../components/marketing/lead-form";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { SITE } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Questions about BCP Studio OS? Reach our team directly.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />

      <Hero
        eyebrow="Frame 012 · Contact"
        title="Send us a message."
        subtitle={`Questions about pricing, migrating from another tool, or anything else — our team replies within one business day. You can also email us directly at ${SITE.supportEmail}.`}
      />

      <Section tone="paper">
        <div className="mx-auto max-w-xl">
          <div className="relative">
            <LeadForm type="contact" submitLabel="Send message" />
          </div>
        </div>
      </Section>
    </>
  );
}
