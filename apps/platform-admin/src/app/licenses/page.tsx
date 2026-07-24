"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface LicenseRow {
  id: string;
  key: string;
  tier: string;
  status: "active" | "suspended" | "expired" | "revoked";
  issuedAt: string;
  expiresAt: string;
  studio: { name: string; slug: string };
}

interface LicensesResponse {
  items: LicenseRow[];
  total: number;
}

const statusVariant: Record<LicenseRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  suspended: "warning",
  expired: "destructive",
  revoked: "destructive",
};

export default function LicensesPage() {
  const { data, loading, refetch } = useApiGet<LicensesResponse>("/platform/licenses");

  const columns: DataColumn<LicenseRow>[] = [
    { id: "studio", header: "Studio", isPrimary: true, cell: (row) => row.studio.name },
    { id: "tier", header: "Tier", cell: (row) => row.tier },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
    { id: "expiresAt", header: "Expires", cell: (row) => new Date(row.expiresAt).toLocaleDateString(), align: "end" },
  ];

  async function revoke(licenseId: string) {
    await apiPost(`/platform/licenses/${licenseId}/revoke`, { reason: "Manual revocation via Platform Admin" });
    refetch();
  }

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Licenses" description="One-year license keys issued to studios." />
      <ResponsiveDataView
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) =>
          row.status === "active" ? (
            <Button size="sm" variant="destructive" onClick={() => revoke(row.id)}>
              Revoke
            </Button>
          ) : null
        }
      />
    </ResponsiveContentContainer>
  );
}
