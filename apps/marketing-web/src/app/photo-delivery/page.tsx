import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Photo Delivery",
  description: "Deliver finished shoots to clients automatically — watermarked previews, full-resolution downloads, and a WhatsApp notification the moment a gallery is ready.",
  path: "/photo-delivery",
});

export default function PhotoDeliveryPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Photo Delivery", path: "/photo-delivery" }])} />

      <Hero
        eyebrow="Frame 005 · Photo Delivery"
        title="From upload to inbox, developed automatically."
        subtitle="Upload a shoot's photos once. Clients get a WhatsApp notification the moment their gallery is ready, with watermarked previews to browse and full-resolution downloads once payment is settled."
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <Eyebrow>01</Eyebrow>
            <h3 className="font-display text-2xl">Upload once</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Bulk upload straight from your editing software or a folder — the platform handles resizing, watermarking, and organizing by shoot automatically.
            </p>
          </div>
          <div>
            <Eyebrow>02</Eyebrow>
            <h3 className="font-display text-2xl">Client is notified</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              A WhatsApp message goes out automatically the moment a gallery is published, with a direct link — no manual follow-up needed.
            </p>
          </div>
          <div>
            <Eyebrow>03</Eyebrow>
            <h3 className="font-display text-2xl">Payment-gated downloads</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Set full-resolution downloads to unlock automatically once a balance is paid — no chasing clients for a final payment before they get their photos.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
