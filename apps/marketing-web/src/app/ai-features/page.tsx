import type { Metadata } from "next";
import { Hero } from "../../components/marketing/hero";
import { Eyebrow, Section } from "../../components/marketing/section";
import { SpecTag } from "../../components/marketing/spec-tag";
import { CtaBand } from "../../components/marketing/cta-band";
import { JsonLd } from "../../components/seo/json-ld";
import { buildMetadata, breadcrumbJsonLd } from "../../lib/seo";
import { getKeySection } from "../../lib/content";

export const metadata: Metadata = buildMetadata({
  title: "AI Features",
  description: "AI face search lets clients find their own photos instantly. AI photo intelligence speeds up culling thousands of shoot frames.",
  path: "/ai-features",
});

const faceSearch = getKeySection("ai-face-search");
const photoIntelligence = getKeySection("ai-photo-intelligence");

export default function AiFeaturesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "AI Features", path: "/ai-features" }])} />

      <Hero
        eyebrow="Frame 003 · AI Features"
        title="Let the frames find their own audience."
        subtitle="Two AI systems built specifically for event photography — one helps guests find themselves in a gallery of thousands, the other helps you cull thousands down to your best shots."
        primaryCta={{ label: "Start free trial", href: "/register" }}
        secondaryCta={{ label: "Book a demo", href: "/book-demo" }}
      />

      <Section tone="paper">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <div>
            <SpecTag tone="light">{faceSearch.frameNumber} · {faceSearch.specTag}</SpecTag>
            <h2 className="mt-4 font-display text-3xl leading-tight">{faceSearch.name}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">{faceSearch.description}</p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
              <li>— Guests search by selfie, no manual tagging by your team required</li>
              <li>— Results return in seconds, even across a gallery of thousands of frames</li>
              <li>— Runs entirely inside your branded, watermarked client gallery</li>
            </ul>
          </div>
          <div>
            <SpecTag tone="light">{photoIntelligence.frameNumber} · {photoIntelligence.specTag}</SpecTag>
            <h2 className="mt-4 font-display text-3xl leading-tight">{photoIntelligence.name}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">{photoIntelligence.description}</p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-soft">
              <li>— Automatic scene and moment tagging as photos are uploaded</li>
              <li>— Duplicate, blink, and blur detection flags frames worth a second look</li>
              <li>— Quality scoring helps your editors start from the strongest shots</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="ink">
        <Eyebrow tone="ink">Included on</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          AI face search ships on the Professional plan and above; AI photo intelligence is available as an add-on
          for higher-volume studios.
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-ink-faint">See the full breakdown on the pricing page, including monthly search and analysis allowances per plan.</p>
      </Section>

      <CtaBand title="See AI face search on your own gallery" subtitle="Book a walkthrough and we'll run it against a sample of your own event photos." />
    </>
  );
}
