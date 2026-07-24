import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { getKeySection } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "Client Gallery",
  description: "A fast, branded, mobile-friendly gallery your clients actually enjoy browsing — with favoriting, commenting, and AI face search built in.",
  path: "/gallery",
});

const gallery = getKeySection("client-gallery");

export default function GalleryPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Gallery", path: "/gallery" }])} />

      <Hero
        eyebrow={`Frame 006 · ${gallery.name}`}
        title="A gallery worth sharing, not just sending."
        subtitle={gallery.description}
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Fast on any connection", body: "Progressively loaded, compressed for mobile data — galleries open in seconds even on a slow connection." },
            { title: "Your brand, not ours", body: "Logo, colors, and your own domain — clients never see the BCP Studio OS name." },
            { title: "Favoriting & comments", body: "Clients mark favorites and leave notes per photo, so your team knows exactly what to prioritize." },
            { title: "Find yourself instantly", body: "AI face search (on Professional and above) lets guests filter a gallery of thousands down to just their own photos." },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Watermarking & security</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          Previews are watermarked automatically; full-resolution downloads unlock exactly when you decide they should.
        </h2>
      </Section>

      <CtaBand />
    </>
  );
}
