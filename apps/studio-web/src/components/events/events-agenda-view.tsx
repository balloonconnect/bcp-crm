"use client";

import { groupEventsForAgenda } from "@bcp/events";
import { useEvents, type EventRecord } from "../../lib/events-context";

type AgendaEvent = Omit<EventRecord, "scheduledAt"> & { scheduledAt: Date };

/** Mobile's default view — a day-grouped list, per the brief. Uses `@bcp/events`' `groupEventsForAgenda` directly rather than reimplementing the grouping/sorting here. */
export function EventsAgendaView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events } = useEvents();
  const mapped: AgendaEvent[] = events.map((e) => ({ ...e, scheduledAt: new Date(e.scheduledAt) }));
  const groups = groupEventsForAgenda(mapped);

  if (groups.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">No events yet.</p>;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.dateKey}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {new Date(group.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {group.events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onOpen({ ...event, scheduledAt: event.scheduledAt.toISOString() })}
                  className="flex w-full flex-col gap-0.5 p-3 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {event.scheduledAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                    {event.venue ? ` · ${event.venue}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
