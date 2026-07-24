"use client";

import { Badge, ResponsiveDataView, type DataColumn } from "@bcp/ui";
import { useEvents, type EventRecord } from "../../lib/events-context";

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  enquiry: "outline", confirmed: "secondary", in_progress: "warning", completed: "success", cancelled: "destructive",
};

export function EventsListView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events, loading } = useEvents();

  const columns: DataColumn<EventRecord>[] = [
    { id: "title", header: "Event", cell: (row) => row.title, isPrimary: true },
    { id: "type", header: "Type", cell: (row) => row.eventType, hideBelow: "sm" },
    { id: "client", header: "Client", cell: (row) => row.client?.name ?? "—", hideBelow: "md" },
    { id: "when", header: "When", cell: (row) => new Date(row.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) },
    { id: "venue", header: "Venue", cell: (row) => row.venue ?? "—", hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status.replace(/_/g, " ")}</Badge> },
  ];

  return (
    <ResponsiveDataView
      columns={columns}
      rows={events}
      getRowId={(row) => row.id}
      onRowClick={onOpen}
      isLoading={loading}
      emptyState={<p className="py-12 text-center text-sm text-muted-foreground">No events yet.</p>}
    />
  );
}
