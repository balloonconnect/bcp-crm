"use client";

import * as React from "react";
import { apiGet } from "../../lib/api-client";

interface FinancialSummary {
  revenue: number;
  directCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  allocatedOverhead: number;
  receivables: number;
  payables: number;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function FinancePage() {
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const load = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    const res = await apiGet<FinancialSummary>(`/finance/summary?${params.toString()}`);
    if (res.ok && res.data) setSummary(res.data);
  }, [from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">Finance</h1>

      <div className="mb-6 flex gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl">{formatRupees(summary.revenue)}</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl">{formatRupees(summary.directCost)}</p><p className="text-xs text-muted-foreground">Direct cost</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl">{formatRupees(summary.allocatedOverhead)}</p><p className="text-xs text-muted-foreground">Overhead</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl">{formatRupees(summary.grossProfit)}</p><p className="text-xs text-muted-foreground">Gross profit ({summary.grossMarginPercent.toFixed(0)}%)</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl">{formatRupees(summary.netProfit)}</p><p className="text-xs text-muted-foreground">Net profit ({summary.netMarginPercent.toFixed(0)}%)</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl text-warning">{formatRupees(summary.receivables)}</p><p className="text-xs text-muted-foreground">Receivables</p></div>
          <div className="rounded-md border border-border p-4"><p className="font-display text-2xl text-destructive">{formatRupees(summary.payables)}</p><p className="text-xs text-muted-foreground">Payables</p></div>
        </div>
      )}
    </main>
  );
}
