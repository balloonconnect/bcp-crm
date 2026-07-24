"use client";

import { groupEventsForKanban } from "@bcp/events";
import { useEvents, type EventRecord } from "../../lib/events-context";

const STATUS_ORDER = ["enquiry", "confirmed", "in_progress", "completed", "cancelled"];
const STATUS_LABELS: Record<string, string> = { enquiry: "Enquiry", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

type KanbanEvent = Omit<EventRecord, "scheduledAt"> & { scheduledAt: Date };

export function EventsKanbanView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events } = useEvents();
  const mapped: KanbanEvent[] = events.map((e) => ({ ...e, scheduledAt: new Date(e.scheduledAt) }));
  const columns = groupEventsForKanban(mapped, STATUS_ORDER);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.status} className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold">{STATUS_LABELS[column.status] ?? column.status}</h3>
            <span className="text-xs text-muted-foreground">{column.events.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {column.events.map((event) => (
              <button key={event.id} type="button" onClick={() => onOpen({ ...event, scheduledAt: event.scheduledAt.toISOString() })} className="rounded-md border border-border bg-card p-3 text-left text-sm shadow-sm">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.scheduledAt.toLocaleDateString("en-IN")}</p>
              </button>
            ))}
            {column.events.length === 0 && <p className="px-1 text-xs text-muted-foreground">No events</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
