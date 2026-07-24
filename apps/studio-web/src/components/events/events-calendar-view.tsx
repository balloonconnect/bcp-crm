"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, cn } from "@bcp/ui";
import { useEvents, type EventRecord } from "../../lib/events-context";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function EventsCalendarView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events } = useEvents();
  const [cursor, setCursor] = React.useState(() => startOfMonth(new Date()));

  const firstDay = startOfMonth(cursor);
  const totalDays = daysInMonth(cursor);
  const leadingBlanks = firstDay.getDay();

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, EventRecord[]>();
    for (const event of events) {
      const date = new Date(event.scheduledAt);
      if (date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth()) {
        const day = date.getDate();
        map.set(day, [...(map.get(day) ?? []), event]);
      }
    }
    return map;
  }, [events, cursor]);

  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
          return (
            <div
              key={index}
              className={cn(
                "flex min-h-20 flex-col gap-1 rounded-md border border-border p-1.5 text-left sm:min-h-24",
                !day && "border-transparent",
                day && isCurrentMonth && day === today.getDate() && "border-brand",
              )}
            >
              {day && <span className="text-xs text-muted-foreground">{day}</span>}
              {dayEvents.map((event) => (
                <button key={event.id} type="button" onClick={() => onOpen(event)} className="truncate rounded bg-brand/10 px-1.5 py-0.5 text-left text-[11px] text-brand hover:bg-brand/20" title={event.title}>
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
