"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface SubscriptionRow {
  id: string;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt: string;
  studio: { name: string; slug: string };
  plan: { key: string; name: string };
}

interface SubscriptionsResponse {
  items: SubscriptionRow[];
  total: number;
}

const statusVariant: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  trialing: "secondary",
  active: "success",
  grace: "warning",
  past_due: "warning",
  suspended: "destructive",
  expired: "destructive",
  cancelled: "secondary",
};

export default function SubscriptionsPage() {
  const { data, loading } = useApiGet<SubscriptionsResponse>("/platform/subscriptions");

  const columns: DataColumn<SubscriptionRow>[] = [
    { id: "studio", header: "Studio", isPrimary: true, cell: (row) => row.studio.name },
    { id: "plan", header: "Plan", cell: (row) => row.plan.name },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status] ?? "secondary"}>{row.status}</Badge> },
    { id: "billingCycle", header: "Cycle", cell: (row) => row.billingCycle, hideBelow: "lg" },
    { id: "endsAt", header: "Ends", cell: (row) => new Date(row.endsAt).toLocaleDateString(), align: "end" },
  ];

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Subscriptions" description="Every studio's subscription history — the current one is the most recent non-cancelled row." />
      <ResponsiveDataView columns={columns} rows={data?.items ?? []} getRowId={(row) => row.id} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
