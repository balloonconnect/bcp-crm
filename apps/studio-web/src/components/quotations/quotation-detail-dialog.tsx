"use client";

import * as React from "react";
import { Download, Mail, MessageCircle, Copy, ArrowRightCircle, Eye, EyeOff } from "lucide-react";
import { ResponsiveDialog, Badge, Button, cn } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, getAccessToken } from "../../lib/api-client";

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  status: string;
  totalAmount: number;
  internalCost: number;
  viewCount: number;
  lastViewedAt: string | null;
  itemLevelPricingEnabled: boolean;
}
interface Margin { internalCost: number; totalAmount: number; margin: number; marginPercent: number }
interface Revision { id: string; revisionNumber: number; changeSummary: string | null; createdAt: string }
interface ViewRecord { id: string; viewedAt: string; ipAddress: string | null; userAgent: string | null }

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const NEXT_STATUSES: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  viewed: ["accepted", "rejected", "expired"],
  accepted: ["converted", "rejected"],
  expired: ["sent"],
};

export function QuotationDetailDialog({ quotationId, open, onOpenChange, onChanged }: { quotationId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [quotation, setQuotation] = React.useState<QuotationDetail | null>(null);
  const [margin, setMargin] = React.useState<Margin | null>(null);
  const [revisions, setRevisions] = React.useState<Revision[]>([]);
  const [views, setViews] = React.useState<ViewRecord[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!quotationId) return;
    void apiGet<QuotationDetail>(`/quotations/${quotationId}`).then((res) => res.ok && setQuotation(res.data ?? null));
    void apiGet<Margin>(`/quotations/${quotationId}/margin`).then((res) => res.ok && setMargin(res.data ?? null));
    void apiGet<Revision[]>(`/quotations/${quotationId}/revisions`).then((res) => res.ok && setRevisions(res.data ?? []));
    void apiGet<ViewRecord[]>(`/quotations/${quotationId}/views`).then((res) => res.ok && setViews(res.data ?? []));
  }, [quotationId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleAction(fn: () => Promise<{ ok: boolean; error?: { message: string } }>, successMessage: string) {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setBusy(false);
    setMessage(res.ok ? successMessage : res.error?.message ?? "Something went wrong");
    if (res.ok) {
      await load();
      onChanged();
    }
  }

  if (!quotation) return null;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={quotation.quotationNumber} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">{quotation.status}</Badge>
          <Badge variant={quotation.itemLevelPricingEnabled ? "warning" : "outline"}>
            {quotation.itemLevelPricingEnabled ? <Eye className="mr-1 h-3 w-3" aria-hidden="true" /> : <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />}
            {quotation.itemLevelPricingEnabled ? "Item pricing visible" : "Item pricing hidden"}
          </Badge>
          <span className="text-xs text-muted-foreground">{quotation.viewCount} view{quotation.viewCount === 1 ? "" : "s"}{quotation.lastViewedAt ? ` · last ${new Date(quotation.lastViewedAt).toLocaleString("en-IN")}` : ""}</span>
        </div>

        {margin && (
          <div className="grid grid-cols-3 gap-4 rounded-md border border-border p-3">
            <div><p className="text-xs text-muted-foreground">Internal cost</p><p className="text-sm font-medium">{formatRupees(margin.internalCost)}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer total</p><p className="text-sm font-medium">{formatRupees(margin.totalAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Margin</p><p className="text-sm font-medium">{formatRupees(margin.margin)} ({margin.marginPercent.toFixed(0)}%)</p></div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(NEXT_STATUSES[quotation.status] ?? []).map((status) => (
            <Button key={status} type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleAction(() => apiPatch(`/quotations/${quotation.id}/status`, { status }), `Marked as ${status}`)}>
              Mark {status}
            </Button>
          ))}
          {quotation.status === "accepted" && (
            <Button type="button" size="sm" disabled={busy} onClick={() => void handleAction(() => apiPost(`/quotations/${quotation.id}/convert`), "Converted to booking")}>
              <ArrowRightCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Convert to booking
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleAction(() => apiPost(`/quotations/${quotation.id}/clone`), "Cloned as a new draft")}>
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Clone
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleAction(() => apiPost(`/quotations/${quotation.id}/send/email`), "Sent by email")}>
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Email
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleAction(() => apiPost(`/quotations/${quotation.id}/send/whatsapp`), "Sent via WhatsApp")}>
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${apiBase}/quotations/${quotation.id}/pdf`} target="_blank" rel="noreferrer" onClick={(e) => {
              // Studio-side PDF download requires an auth header the browser's default navigation can't attach — open via fetch+blob instead.
              e.preventDefault();
              const token = getAccessToken();
              void fetch(`${apiBase}/quotations/${quotation.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" })
                .then((r) => r.blob())
                .then((blob) => window.open(URL.createObjectURL(blob), "_blank"));
            }}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              PDF
            </a>
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Revision history</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {revisions.map((rev) => (
              <li key={rev.id} className="flex items-center justify-between py-2">
                <span>Rev {rev.revisionNumber} — {rev.changeSummary}</span>
                <span className="text-xs text-muted-foreground">{new Date(rev.createdAt).toLocaleString("en-IN")}</span>
              </li>
            ))}
            {revisions.length === 0 && <p className="py-2 text-xs text-muted-foreground">No revisions yet.</p>}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">View & audit log</h3>
          <ul className={cn("flex flex-col divide-y divide-border text-sm", views.length === 0 && "text-xs text-muted-foreground")}>
            {views.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2 text-xs text-muted-foreground">
                <span>{new Date(v.viewedAt).toLocaleString("en-IN")}</span>
                <span>{v.ipAddress ?? "unknown IP"}</span>
              </li>
            ))}
            {views.length === 0 && "No views yet."}
          </ul>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
