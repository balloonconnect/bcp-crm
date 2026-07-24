"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { apiGet } from "../../../lib/api-client";
import { formatRupees } from "../../../lib/leads-context";

interface ScoreResult {
  score: number;
  factors: { label: string; points: number }[];
}
interface BudgetPrediction {
  predictedAmount: number | null;
  basis: string;
  sampleSize: number;
}
interface PackageSuggestion {
  suggestedPackage: { name: string; price: number } | null;
  reason: string;
}

/** All three "AI" insights are rule-based heuristics computed from the lead's own fields and the studio's past won leads — see docs/lead-management.md. Labeled plainly here rather than oversold as a trained model. */
export function LeadAiInsightsTab({ leadId }: { leadId: string }) {
  const [score, setScore] = React.useState<ScoreResult | null>(null);
  const [budget, setBudget] = React.useState<BudgetPrediction | null>(null);
  const [suggestion, setSuggestion] = React.useState<PackageSuggestion | null>(null);

  React.useEffect(() => {
    void apiGet<ScoreResult>(`/leads/${leadId}/ai/score`).then((res) => res.ok && setScore(res.data ?? null));
    void apiGet<BudgetPrediction>(`/leads/${leadId}/ai/budget-prediction`).then((res) => res.ok && setBudget(res.data ?? null));
    void apiGet<PackageSuggestion>(`/leads/${leadId}/ai/package-suggestion`).then((res) => res.ok && setSuggestion(res.data ?? null));
  }, [leadId]);

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Rule-based suggestions from this lead&apos;s details and the studio&apos;s past won leads — not a trained model.
      </p>

      {score && (
        <div>
          <p className="text-sm font-medium">Lead score: {score.score}/100</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {score.factors.map((factor, i) => (
              <li key={i}>{factor.points >= 0 ? "+" : ""}{factor.points} — {factor.label}</li>
            ))}
          </ul>
        </div>
      )}

      {budget && (
        <div>
          <p className="text-sm font-medium">
            Predicted budget: {budget.predictedAmount !== null ? formatRupees(budget.predictedAmount) : "Not enough data yet"}
          </p>
          {budget.predictedAmount !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Based on {budget.sampleSize} past won lead{budget.sampleSize === 1 ? "" : "s"} ({budget.basis.replace(/_/g, " ")}).
            </p>
          )}
        </div>
      )}

      {suggestion && (
        <div>
          <p className="text-sm font-medium">
            Suggested package: {suggestion.suggestedPackage ? `${suggestion.suggestedPackage.name} (${formatRupees(suggestion.suggestedPackage.price)})` : "None"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
        </div>
      )}
    </div>
  );
}
