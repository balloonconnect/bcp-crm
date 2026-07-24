import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { PricingCards, PricingComparisonTable } from "../../components/marketing/pricing-table";
import { FaqAccordion } from "../../components/marketing/faq-accordion";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from "../../lib/seo";
import { GENERAL_FAQS } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description: "Flat, transparent pricing with zero commission on bookings. Every studio starts on a 14-day free trial.",
  path: "/pricing",
});

const pricingFaqs = GENERAL_FAQS.filter((faq) => ["Do you take a commission on my bookings?", "Do you offer a free trial?", "What happens to my data if I cancel?"].includes(faq.question));

export default function PricingPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }])} />
      <JsonLd data={faqPageJsonLd(pricingFaqs)} />

      <Hero
        eyebrow="Frame 008 · Pricing"
        title="One flat price. Zero commission. Always."
        subtitle="Every plan includes a 14-day free trial — no credit card required to start setting up your studio."
      />

      <Section tone="paper">
        <PricingCards />
      </Section>

      <Section tone="paper" className="pt-0 sm:pt-0 lg:pt-0">
        <Eyebrow>Compare in detail</Eyebrow>
        <h2 className="mb-8 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">Plan comparison</h2>
        <PricingComparisonTable />
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Pricing questions</Eyebrow>
        <h2 className="mb-8 max-w-2xl font-display text-3xl leading-tight text-paper sm:text-4xl">Frequently asked</h2>
        <div className="rounded-lg bg-paper p-6 sm:p-8">
          <FaqAccordion items={pricingFaqs} />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
