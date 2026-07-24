"use client";

import * as React from "react";
import { Plus, List, CalendarDays, GanttChartSquare, Rows3, Map as MapIcon, Columns3 } from "lucide-react";
import { Button, cn } from "@bcp/ui";
import { EventsProvider, useEvents, useDefaultView, type EventRecord } from "../../lib/events-context";
import { EventsListView } from "../../components/events/events-list-view";
import { EventsAgendaView } from "../../components/events/events-agenda-view";
import { EventsCalendarView } from "../../components/events/events-calendar-view";
import { EventsTimelineView } from "../../components/events/events-timeline-view";
import { EventsKanbanView } from "../../components/events/events-kanban-view";
import { EventsMapView } from "../../components/events/events-map-view";
import { EventFormDialog } from "../../components/events/event-form-dialog";
import { EventDetailDialog } from "../../components/events/event-detail-dialog";

type ViewKey = "list" | "agenda" | "calendar" | "timeline" | "kanban" | "map";

const VIEWS: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "agenda", label: "Agenda", icon: Rows3 },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "list", label: "List", icon: List },
  { key: "timeline", label: "Timeline", icon: GanttChartSquare },
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "map", label: "Map", icon: MapIcon },
];

function EventsPageBody() {
  const { error } = useEvents();
  const defaultView = useDefaultView();
  const [view, setView] = React.useState<ViewKey | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const activeView = view ?? defaultView;

  function openEvent(event: EventRecord) {
    setDetailId(event.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Events</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New event
        </Button>
      </div>

      <div role="tablist" aria-label="Event views" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={activeView === v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              activeView === v.key ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <v.icon className="h-4 w-4" aria-hidden="true" />
            {v.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      {activeView === "list" && <EventsListView onOpen={openEvent} />}
      {activeView === "agenda" && <EventsAgendaView onOpen={openEvent} />}
      {activeView === "calendar" && <EventsCalendarView onOpen={openEvent} />}
      {activeView === "timeline" && <EventsTimelineView onOpen={openEvent} />}
      {activeView === "kanban" && <EventsKanbanView onOpen={openEvent} />}
      {activeView === "map" && <EventsMapView onOpen={openEvent} />}

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <EventDetailDialog eventId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} />
    </div>
  );
}

export default function EventsPage() {
  return (
    <EventsProvider>
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8" data-tour="events-calendar">
        <EventsPageBody />
      </main>
    </EventsProvider>
  );
}
