/**
 * "Relationship score" and "AI summary"/"Recommended next action" are
 * rule-based heuristics in this phase, not a trained model — the same
 * honest choice made for the dashboard's "AI recommendations"
 * (docs/studio-dashboard.md) and lead scoring (@bcp/leads/scoring.ts),
 * for the same reason: there isn't yet enough real outcome history to
 * make a learned model better than a well-documented heuristic. Each
 * function here is pure and documents exactly what it weighs.
 */

export interface RelationshipScoreInput {
  completedEventsCount: number;
  hasOverdueInvoice: boolean;
  averageFeedbackRating: number | null; // 1-5, null if no feedback yet
  daysSinceLastCommunication: number | null;
  referralsGivenCount: number;
  tenureDays: number;
}

export interface RelationshipScoreResult {
  score: number; // 0-100
  factors: { label: string; points: number }[];
}

export function computeRelationshipScore(input: RelationshipScoreInput): RelationshipScoreResult {
  const factors: { label: string; points: number }[] = [];

  factors.push({ label: `${input.completedEventsCount} completed shoot${input.completedEventsCount === 1 ? "" : "s"}`, points: Math.min(input.completedEventsCount * 10, 30) });

  if (input.hasOverdueInvoice) {
    factors.push({ label: "Has an overdue invoice", points: -20 });
  } else {
    factors.push({ label: "No overdue balance", points: 10 });
  }

  if (input.averageFeedbackRating !== null) {
    factors.push({ label: `Average feedback rating ${input.averageFeedbackRating.toFixed(1)}/5`, points: Math.round((input.averageFeedbackRating - 3) * 10) });
  }

  if (input.daysSinceLastCommunication !== null && input.daysSinceLastCommunication <= 30) {
    factors.push({ label: "Recently in touch", points: 10 });
  }

  if (input.referralsGivenCount > 0) {
    factors.push({ label: `Referred ${input.referralsGivenCount} other client${input.referralsGivenCount === 1 ? "" : "s"}`, points: Math.min(input.referralsGivenCount * 15, 30) });
  }

  if (input.tenureDays > 365) {
    factors.push({ label: "Client for over a year", points: 10 });
  }

  const raw = 40 + factors.reduce((sum, f) => sum + f.points, 0); // 40 = neutral baseline for a brand-new client with no history yet
  const score = Math.max(0, Math.min(100, raw));

  return { score, factors };
}
