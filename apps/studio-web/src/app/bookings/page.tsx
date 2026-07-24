"use client";

import * as React from "react";
import { Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { BookingDetailDialog } from "../../components/bookings/booking-detail-dialog";

interface BookingSummary {
  id: string;
  bookingNumber: string;
  status: string;
  sellingPrice: number;
  estimatedProfit: number;
  client: { name: string };
  createdAt: string;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  draft: "outline", awaiting_advance: "warning", confirmed: "secondary", in_progress: "secondary",
  editing: "secondary", client_selection: "secondary", album_design: "secondary", printing: "secondary",
  delivery: "warning", completed: "success", cancelled: "destructive",
};

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<BookingSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<BookingSummary[]>("/bookings");
    if (res.ok && res.data) setBookings(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns: DataColumn<BookingSummary>[] = [
    { id: "number", header: "Booking", cell: (row) => row.bookingNumber, isPrimary: true },
    { id: "client", header: "Client", cell: (row) => row.client.name },
    { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status.replace(/_/g, " ")}</Badge> },
    { id: "selling", header: "Selling price", cell: (row) => formatRupees(row.sellingPrice), align: "end", hideBelow: "md" },
    { id: "profit", header: "Est. profit", cell: (row) => formatRupees(row.estimatedProfit), align: "end", hideBelow: "lg" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Created automatically when a quotation is accepted and converted.</p>
      </div>

      {loading ? (
        <LoadingState label="Loading bookings…" />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Convert an accepted quotation to create your first booking." />
      ) : (
        <ResponsiveDataView columns={columns} rows={bookings} getRowId={(row) => row.id} onRowClick={(row) => setDetailId(row.id)} />
      )}

      <BookingDetailDialog bookingId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
