"use client";

import * as React from "react";
import { Sparkles, Users } from "lucide-react";
import { Badge } from "@bcp/ui";
import { apiGet } from "../../../lib/api-client";
import { formatRupees } from "../../../lib/clients-context";

interface Financials { lifetimeValue: number; outstandingAmount: number }
interface RelationshipScore { score: number; factors: { label: string; points: number }[] }
interface AiInsights { summary: string; nextAction: { action: string; priority: "high" | "medium" | "low" }; relationshipScore: RelationshipScore }
interface Referral { id: string; name: string; createdAt: string }

const PRIORITY_VARIANT = { high: "destructive", medium: "warning", low: "outline" } as const;

export function ClientFinancialsAiTab({ clientId }: { clientId: string }) {
  const [financials, setFinancials] = React.useState<Financials | null>(null);
  const [insights, setInsights] = React.useState<AiInsights | null>(null);
  const [referrals, setReferrals] = React.useState<Referral[]>([]);

  React.useEffect(() => {
    void apiGet<Financials>(`/clients/${clientId}/financials`).then((res) => res.ok && setFinancials(res.data ?? null));
    void apiGet<AiInsights>(`/clients/${clientId}/ai-insights`).then((res) => res.ok && setInsights(res.data ?? null));
    void apiGet<Referral[]>(`/clients/${clientId}/referrals`).then((res) => res.ok && setReferrals(res.data ?? []));
  }, [clientId]);

  return (
    <div className="flex flex-col gap-6">
      {financials && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-display text-2xl">{formatRupees(financials.lifetimeValue)}</p>
            <p className="text-xs text-muted-foreground">Lifetime value</p>
          </div>
          <div>
            <p className={`font-display text-2xl ${financials.outstandingAmount > 0 ? "text-destructive" : ""}`}>{formatRupees(financials.outstandingAmount)}</p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
        </div>
      )}

      {insights && (
        <>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI summary — rule-based, not a trained model
            </p>
            <p className="text-sm">{insights.summary}</p>
          </div>

          <div>
            <p className="text-sm font-medium">Recommended next action</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={PRIORITY_VARIANT[insights.nextAction.priority]}>{insights.nextAction.priority}</Badge>
              <p className="text-sm text-muted-foreground">{insights.nextAction.action}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Relationship score: {insights.relationshipScore.score}/100</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {insights.relationshipScore.factors.map((factor, i) => (
                <li key={i}>{factor.points >= 0 ? "+" : ""}{factor.points} — {factor.label}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div>
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-4 w-4" aria-hidden="true" />
          Referral history
        </p>
        {referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrals yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {referrals.map((referral) => (
              <li key={referral.id}>
                {referral.name} <span className="text-xs text-muted-foreground">({new Date(referral.createdAt).toLocaleDateString("en-IN")})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
