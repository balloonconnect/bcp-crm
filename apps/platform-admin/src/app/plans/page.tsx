"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPatch } from "../../lib/api-client";

interface PlanRow {
  id: string;
  key: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  isActive: boolean;
}

export default function PlansPage() {
  const { data, loading, refetch } = useApiGet<PlanRow[]>("/platform/plans");

  const columns: DataColumn<PlanRow>[] = [
    { id: "name", header: "Plan", isPrimary: true, cell: (row) => row.name },
    { id: "monthly", header: "Monthly", cell: (row) => `${row.currency} ${(row.priceMonthly / 100).toLocaleString()}`, align: "end" },
    { id: "yearly", header: "Yearly", cell: (row) => `${row.currency} ${(row.priceYearly / 100).toLocaleString()}`, align: "end", hideBelow: "lg" },
    { id: "isActive", header: "Status", cell: (row) => <Badge variant={row.isActive ? "success" : "secondary"}>{row.isActive ? "Active" : "Retired"}</Badge> },
  ];

  async function toggleActive(row: PlanRow) {
    await apiPatch(`/platform/plans/${row.id}`, { isActive: !row.isActive });
    refetch();
  }

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader title="Plans" description="The subscription plan catalog every studio picks from." />
      <ResponsiveDataView
        columns={columns}
        rows={data ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) => (
          <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>
            {row.isActive ? "Retire" : "Reactivate"}
          </Button>
        )}
      />
    </ResponsiveContentContainer>
  );
}
