import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { getKeySection } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "White Label",
  description: "Run your CRM, client portal, and galleries on your own domain, with your own logo and colors. Clients never see BCP Studio OS.",
  path: "/white-label",
});

const whiteLabel = getKeySection("white-label-domains");

export default function WhiteLabelPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "White Label", path: "/white-label" }])} />

      <Hero
        eyebrow={`Frame 010 · ${whiteLabel.name}`}
        title="Your studio's name on every frame."
        subtitle={whiteLabel.description}
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Custom domain", body: "Point studio.yourbrand.com at your CRM, client portal, or galleries — DNS-verified before it goes live." },
            { title: "Full brand control", body: "Logo, favicon, colors, and typography carry through the CRM, invoices, emails, and client-facing pages." },
            { title: "Your email identity", body: "Emails send from your own address and display name — not a generic BCP Studio OS sender." },
            { title: "Branded WhatsApp", body: "Automated WhatsApp messages show your studio's display name, not a shared platform number." },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Available from</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          White-label branding and one custom domain are included from the Professional plan up.
        </h2>
      </Section>

      <CtaBand />
    </>
  );
}
