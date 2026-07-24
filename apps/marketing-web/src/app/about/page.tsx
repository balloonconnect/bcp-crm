import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: "BCP Studio OS is built for photography studios — starting with the operational chaos of a real one.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />

      <Hero
        eyebrow="Frame 011 · About"
        title="Built in a real studio, not a boardroom."
        subtitle="BCP Studio OS started as the internal system for a working photography studio — maternity, baby, birthday, and event shoots — before becoming a platform other studios could run on too."
      />

      <Section tone="paper">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Where this came from</Eyebrow>
          <h2 className="font-display text-3xl leading-tight">A studio&apos;s own tools, made available to every studio</h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Most studio software is built by people who&apos;ve never run a shoot calendar, chased a payment over WhatsApp,
            or tried to get a client to pick their album photos before a print deadline. BCP Studio OS started the
            other way around — as the CRM, gallery, and quotation system a real photography studio needed to run its
            own bookings, before it became something other studios could switch to.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            That&apos;s still the test every feature has to pass: does it remove a real piece of friction from a shoot day
            or a client conversation, not just look good on a features page.
          </p>
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">What we believe</Eyebrow>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <h3 className="font-display text-2xl">Your bookings are yours</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              We charge a flat subscription, never a commission. A platform that takes a cut of every booking has
              the wrong incentives.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Your brand is yours</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              Clients should see your studio&apos;s name, not ours. White-label branding isn&apos;t a premium add-on we
              begrudge — it&apos;s how the product should work.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Built for how India books shoots</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">
              GST invoicing, UPI payments, and WhatsApp aren&apos;t afterthoughts bolted onto a template built for
              somewhere else.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
