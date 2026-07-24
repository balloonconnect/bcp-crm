"use client";

import { Card, CardContent, CardHeader, CardTitle, ResponsiveContentContainer, ResponsivePageHeader, LoadingState, ResponsiveDataView, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface StudioStorageUsage {
  studioId: string;
  studioName: string;
  storageGb: number;
}

interface StorageBreakdown {
  total: number;
  topStudios: StudioStorageUsage[];
}

export default function StoragePage() {
  const { data, loading } = useApiGet<StorageBreakdown>("/platform/storage");

  const columns: DataColumn<StudioStorageUsage>[] = [
    { id: "studioName", header: "Studio", isPrimary: true, cell: (row) => row.studioName },
    { id: "storageGb", header: "Storage used", cell: (row) => `${row.storageGb.toLocaleString()} GB`, align: "end" },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader title="Storage" description="Object storage usage this month, across every studio." />
      {loading && <LoadingState label="Loading storage usage…" />}
      {data && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{data.total.toLocaleString()} GB</p>
            </CardContent>
          </Card>
          <ResponsiveDataView columns={columns} rows={data.topStudios} getRowId={(row) => row.studioId} />
        </div>
      )}
    </ResponsiveContentContainer>
  );
}
