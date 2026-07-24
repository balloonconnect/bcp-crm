"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface StudioUserRow {
  id: string;
  email: string;
  name: string;
  status: string;
  lastLoginAt: string | null;
  studio: { name: string; slug: string };
}

interface UsersResponse {
  items: StudioUserRow[];
  total: number;
}

export default function UsersPage() {
  const { data, loading } = useApiGet<UsersResponse>("/platform/users/studio");

  const columns: DataColumn<StudioUserRow>[] = [
    { id: "name", header: "User", isPrimary: true, cell: (row) => row.name },
    { id: "email", header: "Email", cell: (row) => row.email },
    { id: "studio", header: "Studio", cell: (row) => row.studio.name, hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant="secondary">{row.status}</Badge> },
  ];

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Users" description="Every studio user across the platform — search by email to find which studio someone belongs to." />
      <ResponsiveDataView columns={columns} rows={data?.items ?? []} getRowId={(row) => row.id} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
