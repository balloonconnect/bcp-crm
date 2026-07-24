"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface DomainRow {
  id: string;
  domain: string;
  purpose: string;
  status: "pending" | "verifying" | "verified" | "active" | "failed" | "suspended";
  sslStatus: string;
  studio: { name: string; slug: string };
}

interface DomainsResponse {
  items: DomainRow[];
  total: number;
}

const statusVariant: Record<DomainRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  pending: "secondary",
  verifying: "warning",
  verified: "warning",
  active: "success",
  failed: "destructive",
  suspended: "destructive",
};

export default function DomainsPage() {
  const { data, loading } = useApiGet<DomainsResponse>("/platform/domains");

  const columns: DataColumn<DomainRow>[] = [
    { id: "domain", header: "Domain", isPrimary: true, cell: (row) => row.domain },
    { id: "studio", header: "Studio", cell: (row) => row.studio.name },
    { id: "purpose", header: "Purpose", cell: (row) => row.purpose.replace("_", " "), hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
    { id: "sslStatus", header: "SSL", cell: (row) => row.sslStatus, align: "end" },
  ];

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Domains" description="Custom domains across every studio, from every purpose (CRM, portal, gallery, enquiry form, root site)." />
      <ResponsiveDataView columns={columns} rows={data?.items ?? []} getRowId={(row) => row.id} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
