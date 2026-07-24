"use client";

import { useEvents, type EventRecord } from "../../lib/events-context";

/** A single chronological line through every event (past and upcoming), distinct from Agenda's day-grouped cards — this is the shoot-to-shoot narrative of the studio's whole calendar, useful for seeing the season's flow at a glance rather than picking a specific day. */
export function EventsTimelineView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events } = useEvents();
  const sorted = [...events].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (sorted.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">No events yet.</p>;

  const now = Date.now();

  return (
    <ol className="relative ml-3 flex flex-col gap-6 border-l border-border pl-6">
      {sorted.map((event) => {
        const isPast = new Date(event.scheduledAt).getTime() < now;
        return (
          <li key={event.id} className="relative">
            <span className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-background ${isPast ? "bg-muted-foreground" : "bg-brand"}`} />
            <button type="button" onClick={() => onOpen(event)} className="flex flex-col gap-0.5 text-left">
              <span className="text-xs text-muted-foreground">
                {new Date(event.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {new Date(event.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </span>
              <span className="text-sm font-medium">{event.title}</span>
              <span className="text-xs text-muted-foreground">{event.eventType}{event.venue ? ` · ${event.venue}` : ""}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
