import Link from "next/link";
import { Check } from "lucide-react";
import type { Route } from "next";
import { Button, cn } from "@bcp/ui";
import { PLAN_HIGHLIGHTS, COMPARISON_ROWS, PUBLIC_PLAN_KEYS } from "../../lib/plans-content";

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_HIGHLIGHTS.map((plan) => (
        <div
          key={plan.key}
          className={cn(
            "flex flex-col gap-5 rounded-lg border p-6",
            plan.featured ? "border-safelight bg-charcoal text-paper shadow-lg" : "border-ink-soft/15 bg-paper-dim text-ink",
          )}
        >
          {plan.featured && <span className="w-fit rounded-full bg-safelight px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-widest text-ink">Most popular</span>}
          <div>
            <h3 className="font-display text-2xl">{plan.name}</h3>
            <p className={cn("mt-1 text-sm", plan.featured ? "text-ink-faint" : "text-ink-soft")}>{plan.description}</p>
          </div>
          <p className="font-display text-3xl">{plan.priceMonthlyLabel}</p>
          <ul className="flex flex-col gap-2 text-sm">
            {plan.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-safelight" : "text-safelight-dim")} aria-hidden="true" />
                <span className={plan.featured ? "text-ink-faint" : "text-ink-soft"}>{bullet}</span>
              </li>
            ))}
          </ul>
          <Button
            asChild
            className={cn("mt-auto", plan.featured ? "bg-safelight text-ink hover:bg-safelight/90" : "bg-ink text-paper hover:bg-ink/90")}
          >
            <Link href={(plan.key === "enterprise" ? "/contact" : "/register") as Route}>{plan.key === "enterprise" ? "Contact sales" : "Start free trial"}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

export function PricingComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink-soft/20">
            <th scope="col" className="py-3 pr-4 font-mono text-xs uppercase tracking-widest text-ink-soft">
              Plan
            </th>
            {PUBLIC_PLAN_KEYS.map((key) => (
              <th key={key} scope="col" className="py-3 pr-4 font-display text-base capitalize text-ink">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-ink-soft/10">
              <th scope="row" className="py-3 pr-4 font-normal text-ink-soft">
                {row.label}
              </th>
              {PUBLIC_PLAN_KEYS.map((key) => (
                <td key={key} className="py-3 pr-4 text-ink">
                  {row.get(key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
