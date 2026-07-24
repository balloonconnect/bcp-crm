export interface EventForGrouping {
  id: string;
  scheduledAt: Date;
  status: string;
}

export interface AgendaGroup<T extends EventForGrouping> {
  dateKey: string; // YYYY-MM-DD, studio-local interpretation left to the caller's Date objects
  events: T[];
}

/** Groups events by calendar day and sorts each day's events by start time — the Agenda view's data shape, and mobile's default view per the brief, so this is deliberately simple/cheap to compute on every render rather than something requiring a dedicated endpoint. */
export function groupEventsForAgenda<T extends EventForGrouping>(events: T[]): AgendaGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = event.scheduledAt.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, groupEvents]) => ({ dateKey, events: [...groupEvents].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()) }));
}

export interface KanbanColumn<T extends EventForGrouping> {
  status: string;
  events: T[];
}

/** Groups events by `status` for the Kanban view, preserving a fixed column order rather than however statuses happen to appear in the data. */
export function groupEventsForKanban<T extends EventForGrouping>(events: T[], statusOrder: string[]): KanbanColumn<T>[] {
  return statusOrder.map((status) => ({ status, events: events.filter((e) => e.status === status) }));
}
