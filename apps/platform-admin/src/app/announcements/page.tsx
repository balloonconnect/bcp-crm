"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface AnnouncementRow {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  isPublished: boolean;
  startsAt: string;
}

const severityVariant: Record<AnnouncementRow["severity"], "secondary" | "warning" | "destructive"> = {
  info: "secondary",
  warning: "warning",
  critical: "destructive",
};

export default function AnnouncementsPage() {
  const { data, loading, refetch } = useApiGet<AnnouncementRow[]>("/platform/announcements");

  const columns: DataColumn<AnnouncementRow>[] = [
    { id: "title", header: "Announcement", isPrimary: true, cell: (row) => row.title },
    { id: "severity", header: "Severity", cell: (row) => <Badge variant={severityVariant[row.severity]}>{row.severity}</Badge> },
    {
      id: "isPublished",
      header: "Status",
      cell: (row) => <Badge variant={row.isPublished ? "success" : "secondary"}>{row.isPublished ? "Published" : "Draft"}</Badge>,
    },
  ];

  async function publish(id: string) {
    await apiPost(`/platform/announcements/${id}/publish`);
    refetch();
  }

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader title="Announcements" description="Platform-wide banners shown in studio-facing apps." />
      <ResponsiveDataView
        columns={columns}
        rows={data ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) =>
          !row.isPublished ? (
            <Button size="sm" variant="outline" onClick={() => publish(row.id)}>
              Publish
            </Button>
          ) : null
        }
      />
    </ResponsiveContentContainer>
  );
}
