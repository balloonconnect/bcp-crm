import { Section } from "./section";

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

/**
 * Legal pages deliberately skip the contact-sheet motif — restraint,
 * per the design brief: dense policy text needs to be scannable, not
 * stylized. Plain editorial serif headings and generous line length
 * limits are the entire "design" here.
 */
export function LegalPage({ title, effectiveDate, intro, sections }: { title: string; effectiveDate: string; intro: string; sections: LegalSection[] }) {
  return (
    <Section tone="paper">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        <p className="mt-3 text-sm text-ink-soft">Effective {effectiveDate}</p>
        <p className="mt-6 text-base leading-relaxed text-ink-soft">{intro}</p>

        <div className="mt-12 flex flex-col gap-10">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="font-display text-2xl">{section.heading}</h2>
              <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-ink-soft">{section.body}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
