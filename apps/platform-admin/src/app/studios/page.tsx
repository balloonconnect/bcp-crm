"use client";

import * as React from "react";
import {
  ResponsiveContentContainer,
  ResponsivePageHeader,
  ResponsiveDataView,
  Badge,
  Button,
  type DataColumn,
} from "@bcp/ui";
import { Can } from "@bcp/permissions/client";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface StudioRow {
  id: string;
  name: string;
  slug: string;
  status: "trial" | "active" | "grace" | "suspended" | "expired" | "cancelled";
  createdAt: string;
  brand: { displayName: string | null } | null;
  _count: { users: number; branches: number };
}

interface StudiosResponse {
  items: StudioRow[];
  total: number;
}

const statusVariant: Record<StudioRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  trial: "secondary",
  active: "success",
  grace: "warning",
  suspended: "destructive",
  expired: "destructive",
  cancelled: "secondary",
};

export default function StudiosPage() {
  const { data, loading, refetch } = useApiGet<StudiosResponse>("/platform/studios");

  const columns: DataColumn<StudioRow>[] = [
    { id: "name", header: "Studio", isPrimary: true, cell: (row) => row.brand?.displayName ?? row.name },
    { id: "slug", header: "Slug", cell: (row) => row.slug, hideBelow: "lg" },
    {
      id: "status",
      header: "Status",
      cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
    },
    { id: "users", header: "Users", cell: (row) => row._count.users, align: "end" },
    { id: "branches", header: "Branches", cell: (row) => row._count.branches, align: "end", hideBelow: "xl" },
  ];

  async function handleSuspend(studioId: string) {
    await apiPost(`/platform/studios/${studioId}/suspend`, { reason: "Manual suspension via Platform Admin" });
    refetch();
  }

  async function handleReinstate(studioId: string) {
    await apiPost(`/platform/studios/${studioId}/reinstate`);
    refetch();
  }

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Studios" description={data ? `${data.total} studios on the platform.` : undefined} />
      <ResponsiveDataView
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) => (
          <Can permission="studio:suspend">
            {row.status === "suspended" ? (
              <Button size="sm" variant="outline" onClick={() => handleReinstate(row.id)}>
                Reinstate
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => handleSuspend(row.id)}>
                Suspend
              </Button>
            )}
          </Can>
        )}
      />
    </ResponsiveContentContainer>
  );
}
