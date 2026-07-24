import { cn } from "@bcp/ui";

/** A small mono "exposure" label (e.g. "F/2.8 · PIPELINE") — the site's structural device for tagging each key section with a fabricated-but-consistent camera-spec-style identifier, echoing the photography vernacular the product itself is built for. */
export function SpecTag({ children, className, tone = "dark" }: { children: React.ReactNode; className?: string; tone?: "dark" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest",
        tone === "dark" ? "text-safelight" : "text-safelight-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}
