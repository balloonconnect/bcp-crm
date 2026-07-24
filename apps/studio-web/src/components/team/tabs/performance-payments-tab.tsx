"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { Button, Input, Select, Textarea } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../../lib/api-client";
import { formatRupees } from "../../../lib/team-context";
import type { TeamMemberDetail } from "../../../lib/team-context";

interface PerformanceNoteRecord { id: string; periodLabel: string; ratingScore: number | null; note: string | null; reviewedAt: string }
interface FreelancerPaymentRecord { id: string; amount: number; status: string; dueDate: string | null }

const PAYMENT_STATUS_OPTIONS = [{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" }];

export function PerformancePaymentsTab({ member }: { member: TeamMemberDetail }) {
  const [notes, setNotes] = React.useState<PerformanceNoteRecord[]>([]);
  const [periodLabel, setPeriodLabel] = React.useState("");
  const [ratingScore, setRatingScore] = React.useState("5");
  const [noteText, setNoteText] = React.useState("");

  const [payments, setPayments] = React.useState<FreelancerPaymentRecord[]>([]);
  const [summary, setSummary] = React.useState<{ totalPending: number; totalPaid: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  const isFreelancer = member.employmentType === "freelancer";

  const load = React.useCallback(async () => {
    void apiGet<PerformanceNoteRecord[]>(`/team-members/${member.id}/performance-notes`).then((res) => res.ok && setNotes(res.data ?? []));
    if (isFreelancer) {
      void apiGet<FreelancerPaymentRecord[]>(`/freelancer-payments?studioUserId=${member.id}`).then((res) => res.ok && setPayments(res.data ?? []));
      void apiGet<{ totalPending: number; totalPaid: number }>(`/team-members/${member.id}/freelancer-payments/summary`).then((res) => res.ok && setSummary(res.data ?? null));
    }
  }, [member.id, isFreelancer]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAddNote() {
    if (!periodLabel.trim()) return;
    await apiPost(`/team-members/${member.id}/performance-notes`, { periodLabel, ratingScore: Number(ratingScore), note: noteText || undefined });
    setPeriodLabel(""); setNoteText("");
    await load();
  }

  async function handleAddPayment() {
    if (!paymentAmount) return;
    await apiPost(`/team-members/${member.id}/freelancer-payments`, { amount: Math.round(Number(paymentAmount) * 100), notes: paymentNotes || undefined });
    setPaymentAmount(""); setPaymentNotes("");
    await load();
  }

  async function handlePaymentStatus(paymentId: string, status: string) {
    await apiPatch(`/freelancer-payments/${paymentId}/status`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Performance notes</h3>
        <ul className="mb-2 flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{note.periodLabel}</span>
                {note.ratingScore && <span className="flex items-center gap-0.5 text-xs text-muted-foreground">{note.ratingScore}<Star className="h-3 w-3" aria-hidden="true" /></span>}
              </div>
              {note.note && <p className="mt-1 text-muted-foreground">{note.note}</p>}
            </li>
          ))}
          {notes.length === 0 && <p className="text-xs text-muted-foreground">No performance notes yet.</p>}
        </ul>
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <Input placeholder="Period (e.g. Q3 2026)" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
            <Select value={ratingScore} onChange={(e) => setRatingScore(e.target.value)} options={["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: `${v}/5` }))} className="w-24" />
          </div>
          <Textarea placeholder="Note" rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <Button type="button" size="sm" className="self-start" onClick={() => void handleAddNote()}>Add note</Button>
        </div>
      </div>

      {isFreelancer && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Freelancer payments</h3>
          {summary && (
            <div className="mb-2 flex gap-6 text-sm">
              <p><span className="text-muted-foreground">Pending:</span> {formatRupees(summary.totalPending)}</p>
              <p><span className="text-muted-foreground">Paid:</span> {formatRupees(summary.totalPaid)}</p>
            </div>
          )}
          <ul className="mb-2 flex flex-col divide-y divide-border">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                <span>{formatRupees(payment.amount)}{payment.dueDate ? ` · due ${new Date(payment.dueDate).toLocaleDateString("en-IN")}` : ""}</span>
                <Select value={payment.status} onChange={(e) => void handlePaymentStatus(payment.id, e.target.value)} options={PAYMENT_STATUS_OPTIONS} className="w-auto" />
              </li>
            ))}
            {payments.length === 0 && <p className="py-2 text-xs text-muted-foreground">No payments recorded.</p>}
          </ul>
          <div className="flex gap-2">
            <Input type="number" placeholder="Amount (₹)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            <Input placeholder="Notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleAddPayment()}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}
