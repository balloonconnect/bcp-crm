import { LEAD_PRIORITIES, type LeadPriority, type LeadStatus } from "./pipeline";

/**
 * "AI lead score", "AI budget prediction", and "AI package suggestion"
 * are honestly rule-based heuristics in this phase, not a trained
 * model — the same choice made for the dashboard's "AI recommendations"
 * (see docs/studio-dashboard.md) and for the same reason: a real model
 * needs real historical outcome data to be better than a well-chosen
 * heuristic, and this studio doesn't have that yet. Each function below
 * documents exactly what it's weighing so it's auditable, and each is
 * a pure function of its inputs — swapping in a real Claude-based
 * scorer later (via `@bcp/ai`) means replacing the function body, not
 * the call sites.
 */

const SOURCE_QUALITY_WEIGHT: Record<string, number> = {
  referral: 25,
  instagram: 15,
  website: 15,
  whatsapp: 10,
  walk_in: 20,
  other: 5,
};

const PRIORITY_WEIGHT: Record<LeadPriority, number> = Object.fromEntries(LEAD_PRIORITIES.map((p) => [p.key, p.weight * 10])) as Record<LeadPriority, number>;

export interface LeadScoreInput {
  status: LeadStatus;
  priority: LeadPriority;
  source: string;
  hasPhone: boolean;
  hasEmail: boolean;
  hasBudget: boolean;
  hasEventDate: boolean;
  daysSinceLastContact: number | null; // null = never contacted
}

export interface LeadScoreResult {
  score: number; // 0-100
  factors: { label: string; points: number }[];
}

/** Higher = more likely to convert, weighing contactability, declared priority, source quality, having a concrete budget/date (signals real intent, not just browsing), and a freshness penalty for enquiries going cold without contact. */
export function computeLeadScore(input: LeadScoreInput): LeadScoreResult {
  const factors: { label: string; points: number }[] = [];

  if (input.hasPhone) factors.push({ label: "Has a phone number", points: 15 });
  if (input.hasEmail) factors.push({ label: "Has an email address", points: 5 });
  if (input.hasBudget) factors.push({ label: "Stated a budget", points: 15 });
  if (input.hasEventDate) factors.push({ label: "Has a target event date", points: 10 });

  factors.push({ label: `Priority: ${input.priority}`, points: PRIORITY_WEIGHT[input.priority] });
  factors.push({ label: `Source: ${input.source}`, points: SOURCE_QUALITY_WEIGHT[input.source] ?? 5 });

  if (input.daysSinceLastContact === null) {
    factors.push({ label: "Never contacted", points: -10 });
  } else if (input.daysSinceLastContact > 7) {
    factors.push({ label: "No contact in over a week", points: -15 });
  } else if (input.daysSinceLastContact <= 1) {
    factors.push({ label: "Contacted recently", points: 5 });
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));

  return { score, factors };
}

export interface HistoricalWonLead {
  eventType: string | null;
  amount: number; // paise — expectedValue or budget from a past won lead
}

export interface BudgetPrediction {
  predictedAmount: number | null; // paise
  basis: "event_type_average" | "overall_average" | "insufficient_data";
  sampleSize: number;
}

/** Averages past won leads' budgets, preferring a same-event-type average when there's enough history, falling back to the overall average, and to "no prediction" when there's no history at all yet. */
export function predictBudget(eventType: string | null, wonLeads: HistoricalWonLead[]): BudgetPrediction {
  const sameType = eventType ? wonLeads.filter((l) => l.eventType === eventType) : [];

  if (sameType.length >= 3) {
    const average = Math.round(sameType.reduce((sum, l) => sum + l.amount, 0) / sameType.length);
    return { predictedAmount: average, basis: "event_type_average", sampleSize: sameType.length };
  }

  if (wonLeads.length > 0) {
    const average = Math.round(wonLeads.reduce((sum, l) => sum + l.amount, 0) / wonLeads.length);
    return { predictedAmount: average, basis: "overall_average", sampleSize: wonLeads.length };
  }

  return { predictedAmount: null, basis: "insufficient_data", sampleSize: 0 };
}

export interface PackageOption {
  name: string;
  price: number; // paise
}

export interface PackageSuggestion {
  suggestedPackage: PackageOption | null;
  reason: string;
}

/** Picks the closest-priced package at or below the lead's budget (people rarely want to be shown something over what they said they'd spend); if nothing fits under budget, suggests the cheapest option available instead of suggesting nothing. */
export function suggestPackage(budgetOrExpectedValue: number | null, packages: PackageOption[]): PackageSuggestion {
  if (packages.length === 0) return { suggestedPackage: null, reason: "No packages configured yet." };
  if (budgetOrExpectedValue === null) return { suggestedPackage: null, reason: "No budget stated yet." };

  const withinBudget = packages.filter((p) => p.price <= budgetOrExpectedValue).sort((a, b) => b.price - a.price);
  if (withinBudget.length > 0) {
    return { suggestedPackage: withinBudget[0]!, reason: "Closest package at or under the stated budget." };
  }

  const cheapest = [...packages].sort((a, b) => a.price - b.price)[0]!;
  return { suggestedPackage: cheapest, reason: "Every package is above the stated budget — showing the least expensive option." };
}
