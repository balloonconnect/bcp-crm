"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";
import { ExpenseFormDialog } from "../../components/finance/expense-form-dialog";

interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  gstAmount: number;
  incurredOn: string;
  approvalStatus: string;
  paymentStatus: string;
  vendor: { name: string } | null;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const APPROVAL_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { not_required: "outline", pending: "warning", approved: "success", rejected: "destructive" };
const PAYMENT_VARIANT: Record<string, "outline" | "warning" | "success"> = { unpaid: "warning", partially_paid: "warning", paid: "success" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<ExpenseRecord[]>("/expenses");
    if (res.ok && res.data) setExpenses(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleApproval(id: string, decision: "approved" | "rejected") {
    await apiPost(`/expenses/${id}/approval`, { decision });
    await load();
  }

  async function handleMarkPaid(id: string) {
    await apiPatch(`/expenses/${id}/payment-status`, { status: "paid" });
    await load();
  }

  const columns: DataColumn<ExpenseRecord>[] = [
    { id: "category", header: "Category", cell: (row) => <span className="capitalize">{row.category}</span>, isPrimary: true },
    { id: "vendor", header: "Vendor", cell: (row) => row.vendor?.name ?? "—", hideBelow: "sm" },
    { id: "date", header: "Date", cell: (row) => new Date(row.incurredOn).toLocaleDateString("en-IN"), hideBelow: "md" },
    { id: "amount", header: "Amount", cell: (row) => formatRupees(row.amount + row.gstAmount), align: "end" },
    {
      id: "approval",
      header: "Approval",
      cell: (row) =>
        row.approvalStatus === "pending" ? (
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleApproval(row.id, "rejected")}>Reject</Button>
            <Button type="button" size="sm" onClick={() => void handleApproval(row.id, "approved")}>Approve</Button>
          </div>
        ) : (
          <Badge variant={APPROVAL_VARIANT[row.approvalStatus] ?? "outline"} className="capitalize">{row.approvalStatus.replace(/_/g, " ")}</Badge>
        ),
    },
    {
      id: "payment",
      header: "Payment",
      cell: (row) =>
        row.paymentStatus !== "paid" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void handleMarkPaid(row.id)}>Mark paid</Button>
        ) : (
          <Badge variant={PAYMENT_VARIANT[row.paymentStatus] ?? "outline"} className="capitalize">Paid</Badge>
        ),
      hideBelow: "lg",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Expenses</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New expense
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading expenses…" />
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses yet" description="Log an event or general expense to start tracking costs." />
      ) : (
        <ResponsiveDataView columns={columns} rows={expenses} getRowId={(row) => row.id} />
      )}

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </main>
  );
}
