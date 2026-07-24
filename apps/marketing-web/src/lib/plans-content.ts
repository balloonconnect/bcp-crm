import { PLAN_DEFINITIONS, type PlanKey } from "@bcp/billing";

/**
 * Marketing-facing plan display, built directly from `@bcp/billing`'s
 * `PLAN_DEFINITIONS` — the pricing page shows the same numbers and
 * limits the product actually enforces, rather than a second set of
 * marketing-only figures that could drift out of sync. `custom` is
 * omitted here — it's an internally-negotiated tier, not something
 * publicly advertised; `enterprise` is shown as a "contact us" card.
 *
 * Every numeric limit is `number | null` in the underlying schema
 * (`null` = unlimited), so every read here goes through `formatLimit()`.
 */
export const PUBLIC_PLAN_KEYS: PlanKey[] = ["starter", "professional", "business", "enterprise"];

export function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString("en-IN");
}

export interface PlanHighlight {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthlyLabel: string;
  featured?: boolean;
  bullets: string[];
}

export const PLAN_HIGHLIGHTS: PlanHighlight[] = PUBLIC_PLAN_KEYS.map((key) => {
  const plan = PLAN_DEFINITIONS[key];
  const isNegotiated = plan.priceMonthly === 0;
  const aiSearches = plan.limits.maxAiFaceSearchesPerMonth;

  const bullets = [
    `Up to ${formatLimit(plan.limits.maxUsers)} team members`,
    `Up to ${formatLimit(plan.limits.maxBranches)} branch${plan.limits.maxBranches === 1 ? "" : "es"}`,
    `${plan.limits.maxStorageGb === null ? "Unlimited" : plan.limits.maxStorageGb} GB storage`,
    plan.limits.whiteLabelAccess ? "White-label custom domain" : "BCP Studio OS branded pages",
    aiSearches === null || aiSearches > 0 ? `${formatLimit(aiSearches)} AI face searches/mo` : "AI face search not included",
    plan.limits.apiAccess ? "API access" : "No API access",
  ];

  return {
    key,
    name: plan.name,
    description: plan.description,
    priceMonthlyLabel: isNegotiated ? "Contact us" : `${formatRupees(plan.priceMonthly)}/mo`,
    featured: key === "professional",
    bullets,
  };
});

export const COMPARISON_ROWS: { label: string; get: (key: PlanKey) => string }[] = [
  { label: "Team members", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxUsers) },
  { label: "Branches", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxBranches) },
  { label: "Storage", get: (key) => (PLAN_DEFINITIONS[key].limits.maxStorageGb === null ? "Unlimited" : `${PLAN_DEFINITIONS[key].limits.maxStorageGb} GB`) },
  { label: "Clients", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxClients) },
  { label: "Custom domains", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxCustomDomains) },
  { label: "AI face searches / mo", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxAiFaceSearchesPerMonth) },
  { label: "WhatsApp messages / mo", get: (key) => formatLimit(PLAN_DEFINITIONS[key].limits.maxWhatsappMessagesPerMonth) },
  { label: "White-label branding", get: (key) => (PLAN_DEFINITIONS[key].limits.whiteLabelAccess ? "Included" : "—") },
  { label: "API access", get: (key) => (PLAN_DEFINITIONS[key].limits.apiAccess ? "Included" : "—") },
];
