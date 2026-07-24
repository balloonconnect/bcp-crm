"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@bcp/ui";
import type { WidgetKey } from "@bcp/dashboard";
import { StatDisplay, EmptyRow, ListDisplay, ListRow, formatRupees, formatDateTime } from "./primitives";

interface EventRow {
  id: string;
  title: string;
  scheduledAt: string;
  client?: { name: string } | null;
  assignments?: { studioUser: { name: string } }[];
}
interface LeadRow {
  id: string;
  name: string;
  followUpAt: string | null;
}
interface QuotationRow {
  id: string;
  quotationNumber: string;
  totalAmount: number;
  status: string;
}
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  dueDate: string | null;
}
interface ActivityRow {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
}
interface UsageSnapshot {
  current: number | null;
  limit: number | null;
  percentUsed: number;
  level: "ok" | 70 | 85 | 95 | 100;
}
interface Recommendation {
  priority: "high" | "medium" | "low";
  message: string;
}

const priorityVariant = { high: "destructive", medium: "warning", low: "outline" } as const;

/** One dispatcher rendering all 19 widgets' content from the single `/dashboard/summary` payload — kept in one file since each case is short and having 19 separate files would scatter very small, closely related pieces of rendering logic. */
export function WidgetContent({ widgetKey, data }: { widgetKey: WidgetKey; data: unknown }) {
  switch (widgetKey) {
    case "todays_shoots":
    case "upcoming_events":
    case "editing_pending": {
      const rows = (data as EventRow[]) ?? [];
      if (rows.length === 0) return <EmptyRow message={widgetKey === "editing_pending" ? "Nothing awaiting editing." : "Nothing scheduled."} />;
      return (
        <ListDisplay>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.title}
              subtitle={[row.client?.name, formatDateTime(row.scheduledAt)].filter(Boolean).join(" · ")}
              badge={row.assignments?.length ? { label: `${row.assignments.length} assigned` } : undefined}
            />
          ))}
        </ListDisplay>
      );
    }

    case "follow_ups_due": {
      const rows = (data as LeadRow[]) ?? [];
      if (rows.length === 0) return <EmptyRow message="No follow-ups due." />;
      return (
        <ListDisplay>
          {rows.map((row) => (
            <ListRow key={row.id} title={row.name} subtitle={row.followUpAt ? formatDateTime(row.followUpAt) : undefined} badge={{ label: "Follow up", variant: "warning" }} />
          ))}
        </ListDisplay>
      );
    }

    case "pending_quotations": {
      const rows = (data as QuotationRow[]) ?? [];
      if (rows.length === 0) return <EmptyRow message="No quotations awaiting a response." />;
      return (
        <ListDisplay>
          {rows.map((row) => (
            <ListRow key={row.id} title={row.quotationNumber} subtitle={formatRupees(row.totalAmount)} badge={{ label: row.status, variant: "outline" }} />
          ))}
        </ListDisplay>
      );
    }

    case "pending_payments":
    case "overdue_payments": {
      const rows = (data as InvoiceRow[]) ?? [];
      if (rows.length === 0) return <EmptyRow message="Nothing outstanding." />;
      return (
        <ListDisplay>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.invoiceNumber}
              subtitle={`${formatRupees(row.totalAmount - row.amountPaid)} due${row.dueDate ? ` · ${formatDateTime(row.dueDate)}` : ""}`}
              badge={{ label: widgetKey === "overdue_payments" ? "Overdue" : "Pending", variant: widgetKey === "overdue_payments" ? "destructive" : "warning" }}
            />
          ))}
        </ListDisplay>
      );
    }

    case "new_enquiries":
      return <StatDisplay value={String((data as { count: number })?.count ?? 0)} label="Not yet contacted" />;
    case "confirmed_bookings":
      return <StatDisplay value={String((data as { count: number })?.count ?? 0)} label="Booked, not yet completed" />;
    case "album_selection_pending":
      return <StatDisplay value={String((data as { count: number })?.count ?? 0)} label="Awaiting client selection" />;
    case "printing_pending":
      return <StatDisplay value={String((data as { count: number })?.count ?? 0)} label="Approved, awaiting print" />;
    case "gallery_delivery_pending":
      return <StatDisplay value={String((data as { count: number })?.count ?? 0)} label="Uploaded, not yet delivered" />;

    case "monthly_revenue":
      return <StatDisplay value={formatRupees((data as { amount: number })?.amount ?? 0)} label="Collected this month" tone="positive" />;
    case "monthly_expense":
      return <StatDisplay value={formatRupees((data as { amount: number })?.amount ?? 0)} label="Logged this month" />;
    case "estimated_profit": {
      const amount = (data as { amount: number })?.amount ?? 0;
      return <StatDisplay value={formatRupees(amount)} label="Revenue minus expenses" tone={amount >= 0 ? "positive" : "danger"} />;
    }

    case "storage_usage": {
      const usage = data as UsageSnapshot;
      const label = usage.limit === null ? "Unlimited on your plan" : `of ${usage.limit} GB used`;
      return <StatDisplay value={`${usage.current ?? 0} GB`} label={label} tone={usage.level === "ok" ? "default" : usage.level === 100 ? "danger" : "warning"} />;
    }

    case "team_availability": {
      const availability = data as { active: number; busyToday: number; availableToday: number };
      return (
        <div className="grid grid-cols-3 gap-4">
          <StatDisplay value={String(availability.availableToday)} label="Available today" tone="positive" />
          <StatDisplay value={String(availability.busyToday)} label="On a shoot today" />
          <StatDisplay value={String(availability.active)} label="Active team" />
        </div>
      );
    }

    case "recent_activity": {
      const rows = (data as ActivityRow[]) ?? [];
      if (rows.length === 0) return <EmptyRow message="No activity yet." />;
      return (
        <ListDisplay>
          {rows.map((row) => (
            <ListRow key={row.id} title={row.action.replace(/\./g, " ").replace(/_/g, " ")} subtitle={formatDateTime(row.createdAt)} />
          ))}
        </ListDisplay>
      );
    }

    case "ai_recommendations": {
      const rows = (data as Recommendation[]) ?? [];
      return (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span className="flex-1">{row.message}</span>
              <Badge variant={priorityVariant[row.priority]} className="shrink-0">
                {row.priority}
              </Badge>
            </li>
          ))}
        </ul>
      );
    }

    default:
      return <EmptyRow message="No data." />;
  }
}
