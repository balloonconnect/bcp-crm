"use client";

import * as React from "react";
import { Plus, Trash2, MapPin, Phone, Users } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, apiFetch } from "../../lib/api-client";
import { useEvents, type EventRecord } from "../../lib/events-context";

interface ShotListItem { id: string; description: string; completed: boolean }
interface ScheduleItem { id: string; time: string; label: string }
interface EventDetail extends EventRecord {
  shotListItems: ShotListItem[];
  scheduleItems: ScheduleItem[];
  equipment: { equipment: { name: string }; quantity: number }[];
  services: { service: { name: string } }[];
}

export function EventDetailDialog({ eventId, open, onOpenChange }: { eventId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { refetch } = useEvents();
  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [newShot, setNewShot] = React.useState("");
  const [newScheduleTime, setNewScheduleTime] = React.useState("");
  const [newScheduleLabel, setNewScheduleLabel] = React.useState("");

  const load = React.useCallback(async () => {
    if (!eventId) return;
    const res = await apiGet<EventDetail>(`/events/${eventId}`);
    if (res.ok && res.data) setEvent(res.data);
  }, [eventId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleAddShot() {
    if (!eventId || !newShot.trim()) return;
    await apiPost(`/events/${eventId}/shot-list`, { description: newShot });
    setNewShot("");
    await load();
  }

  async function handleToggleShot(itemId: string, completed: boolean) {
    if (!eventId) return;
    await apiPatch(`/events/${eventId}/shot-list/${itemId}`, { completed });
    await load();
  }

  async function handleRemoveShot(itemId: string) {
    if (!eventId) return;
    await apiFetch(`/events/${eventId}/shot-list/${itemId}`, { method: "DELETE" });
    await load();
  }

  async function handleAddSchedule() {
    if (!eventId || !newScheduleTime || !newScheduleLabel.trim()) return;
    await apiPost(`/events/${eventId}/schedule`, { time: new Date(newScheduleTime).toISOString(), label: newScheduleLabel });
    setNewScheduleTime("");
    setNewScheduleLabel("");
    await load();
  }

  async function handleRemoveSchedule(itemId: string) {
    if (!eventId) return;
    await apiFetch(`/events/${eventId}/schedule/${itemId}`, { method: "DELETE" });
    await load();
  }

  React.useEffect(() => {
    if (!open) void refetch();
  }, [open, refetch]);

  if (!event) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={event.title} description={event.eventType} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">{event.status.replace(/_/g, " ")}</Badge>
          <Badge variant="secondary" className="capitalize">{event.editingStatus.replace(/_/g, " ")}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <p>{new Date(event.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          {event.venue && <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{event.venue}</p>}
          {event.contactPersonName && <p className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{event.contactPersonName} {event.contactPersonPhone}</p>}
          {event.assignments.length > 0 && (
            <p className="flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{event.assignments.map((a) => a.studioUser.name).join(", ")}</p>
          )}
        </div>

        {(event.dressNotes || event.travelNotes || event.accommodationNotes) && (
          <div className="flex flex-col gap-2 text-sm">
            {event.dressNotes && <p><span className="font-medium">Dress:</span> {event.dressNotes}</p>}
            {event.travelNotes && <p><span className="font-medium">Travel:</span> {event.travelNotes}</p>}
            {event.accommodationNotes && <p><span className="font-medium">Accommodation:</span> {event.accommodationNotes}</p>}
          </div>
        )}

        {event.services.length > 0 && <p className="text-sm"><span className="font-medium">Services:</span> {event.services.map((s) => s.service.name).join(", ")}</p>}
        {event.equipment.length > 0 && <p className="text-sm"><span className="font-medium">Equipment:</span> {event.equipment.map((e) => `${e.equipment.name}${e.quantity > 1 ? ` ×${e.quantity}` : ""}`).join(", ")}</p>}
        {event.deliverables.length > 0 && <p className="text-sm"><span className="font-medium">Deliverables:</span> {event.deliverables.join(", ")}</p>}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Shot list</h3>
          <ul className="mb-2 flex flex-col gap-1.5">
            {event.shotListItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <input type="checkbox" checked={item.completed} onChange={(e) => void handleToggleShot(item.id, e.target.checked)} />
                <span className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : ""}`}>{item.description}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleRemoveShot(item.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Add a shot" value={newShot} onChange={(e) => setNewShot(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleAddShot()}><Plus className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Event-day schedule</h3>
          <ul className="mb-2 flex flex-col gap-1.5 text-sm">
            {event.scheduleItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{new Date(item.time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} — {item.label}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleRemoveSchedule(item.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input type="time" value={newScheduleTime} onChange={(e) => setNewScheduleTime(e.target.value ? `${new Date(event.scheduledAt).toISOString().slice(0, 10)}T${e.target.value}` : "")} className="w-32" />
            <Input placeholder="What's happening" value={newScheduleLabel} onChange={(e) => setNewScheduleLabel(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleAddSchedule()}><Plus className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>

        {event.internalNotes && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Internal notes</h3>
            <p className="text-sm text-muted-foreground">{event.internalNotes}</p>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
