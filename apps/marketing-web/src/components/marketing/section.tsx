import { cn } from "@bcp/ui";

export interface SectionProps {
  children: React.ReactNode;
  tone?: "paper" | "ink";
  className?: string;
  id?: string;
}

/** The alternating light "lightbox" / dark "darkroom" band every page's sections are built from — the rhythm that gives long product pages a sense of place rather than one undifferentiated scroll. */
export function Section({ children, tone = "paper", className, id }: SectionProps) {
  return (
    <section id={id} className={cn(tone === "ink" ? "bg-ink text-paper" : "bg-paper text-ink", "px-4 py-16 sm:px-6 sm:py-20 lg:py-28")}>
      <div className={cn("mx-auto w-full max-w-6xl", className)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "paper" }: { children: React.ReactNode; tone?: "paper" | "ink" }) {
  return (
    <p className={cn("mb-4 font-mono text-xs font-medium uppercase tracking-[0.2em]", tone === "ink" ? "text-safelight" : "text-safelight-dim")}>
      {children}
    </p>
  );
}
