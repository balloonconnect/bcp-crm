"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { EVENT_TYPES } from "@bcp/events";
import { apiPost } from "../../lib/api-client";
import { useEvents } from "../../lib/events-context";

interface ConflictResult {
  teamConflicts: { studioUserName: string; conflictsWith: { eventTitle: string }[] }[];
  equipmentConflicts: { equipmentName: string; conflictsWith: { eventTitle: string }[] }[];
  dateTimeConflicts: { eventTitle: string }[];
  travelConflicts: { studioUserName: string; conflictsWith: { eventTitle: string }[] }[];
}

function hasAnyConflict(c: ConflictResult | null): boolean {
  if (!c) return false;
  return c.teamConflicts.length > 0 || c.equipmentConflicts.length > 0 || c.dateTimeConflicts.length > 0 || c.travelConflicts.length > 0;
}

export function EventFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { refetch } = useEvents();
  const [title, setTitle] = React.useState("");
  const [eventType, setEventType] = React.useState<string>(EVENT_TYPES[0]);
  const [customType, setCustomType] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [addressLine1, setAddressLine1] = React.useState("");
  const [addressCity, setAddressCity] = React.useState("");
  const [contactPersonName, setContactPersonName] = React.useState("");
  const [contactPersonPhone, setContactPersonPhone] = React.useState("");
  const [dressNotes, setDressNotes] = React.useState("");
  const [travelNotes, setTravelNotes] = React.useState("");
  const [accommodationNotes, setAccommodationNotes] = React.useState("");
  const [deliverablesText, setDeliverablesText] = React.useState("");
  const [conflicts, setConflicts] = React.useState<ConflictResult | null>(null);
  const [checkingConflicts, setCheckingConflicts] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle(""); setEventType(EVENT_TYPES[0]); setCustomType(""); setScheduledAt(""); setEndAt("");
      setVenue(""); setAddressLine1(""); setAddressCity(""); setContactPersonName(""); setContactPersonPhone("");
      setDressNotes(""); setTravelNotes(""); setAccommodationNotes(""); setDeliverablesText("");
      setConflicts(null); setError(null);
    }
  }, [open]);

  async function handleCheckConflicts() {
    if (!scheduledAt) return;
    setCheckingConflicts(true);
    const res = await apiPost<ConflictResult>("/events/check-conflicts", {
      scheduledAt: new Date(scheduledAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      venue: venue || undefined,
    });
    setCheckingConflicts(false);
    if (res.ok && res.data) setConflicts(res.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      title,
      eventType: eventType === "Custom" ? customType || "Custom" : eventType,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      venue: venue || undefined,
      addressLine1: addressLine1 || undefined,
      addressCity: addressCity || undefined,
      contactPersonName: contactPersonName || undefined,
      contactPersonPhone: contactPersonPhone || undefined,
      dressNotes: dressNotes || undefined,
      travelNotes: travelNotes || undefined,
      accommodationNotes: accommodationNotes || undefined,
      deliverables: deliverablesText.split(",").map((d) => d.trim()).filter(Boolean),
    };

    const res = await apiPost("/events", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this event");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    await refetch();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New event" className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "basics",
              title: "Basics",
              columns: 2,
              children: (
                <>
                  <FormField label="Title" htmlFor="ef-title" required fullWidth><Input id="ef-title" value={title} onChange={(e) => setTitle(e.target.value)} required /></FormField>
                  <FormField label="Event type" htmlFor="ef-type"><Select id="ef-type" value={eventType} onChange={(e) => setEventType(e.target.value)} options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} /></FormField>
                  {eventType === "Custom" && <FormField label="Custom type" htmlFor="ef-custom-type"><Input id="ef-custom-type" value={customType} onChange={(e) => setCustomType(e.target.value)} /></FormField>}
                  <FormField label="Start" htmlFor="ef-start" required><Input id="ef-start" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required /></FormField>
                  <FormField label="End" htmlFor="ef-end"><Input id="ef-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "venue",
              title: "Venue & contact",
              columns: 2,
              children: (
                <>
                  <FormField label="Venue" htmlFor="ef-venue"><Input id="ef-venue" value={venue} onChange={(e) => setVenue(e.target.value)} /></FormField>
                  <FormField label="City" htmlFor="ef-city"><Input id="ef-city" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} /></FormField>
                  <FormField label="Address" htmlFor="ef-address" fullWidth><Input id="ef-address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} /></FormField>
                  <FormField label="Contact person" htmlFor="ef-contact-name"><Input id="ef-contact-name" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} /></FormField>
                  <FormField label="Contact phone" htmlFor="ef-contact-phone"><Input id="ef-contact-phone" value={contactPersonPhone} onChange={(e) => setContactPersonPhone(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "notes",
              title: "Dress, travel & accommodation",
              columns: 1,
              children: (
                <>
                  <FormField label="Dress notes" htmlFor="ef-dress" fullWidth><Textarea id="ef-dress" rows={2} value={dressNotes} onChange={(e) => setDressNotes(e.target.value)} /></FormField>
                  <FormField label="Travel notes" htmlFor="ef-travel" fullWidth><Textarea id="ef-travel" rows={2} value={travelNotes} onChange={(e) => setTravelNotes(e.target.value)} /></FormField>
                  <FormField label="Accommodation notes" htmlFor="ef-accommodation" fullWidth><Textarea id="ef-accommodation" rows={2} value={accommodationNotes} onChange={(e) => setAccommodationNotes(e.target.value)} /></FormField>
                  <FormField label="Deliverables" htmlFor="ef-deliverables" hint="Comma-separated" fullWidth><Input id="ef-deliverables" value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />

        {conflicts && hasAnyConflict(conflicts) && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-medium">Possible scheduling conflicts</p>
              {conflicts.teamConflicts.map((c, i) => <p key={i} className="text-xs text-muted-foreground">{c.studioUserName} is already booked on {c.conflictsWith.map((e) => e.eventTitle).join(", ")}</p>)}
              {conflicts.dateTimeConflicts.map((c, i) => <p key={i} className="text-xs text-muted-foreground">Venue double-booked with {c.eventTitle}</p>)}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={checkingConflicts || !scheduledAt} onClick={() => void handleCheckConflicts()}>
            {checkingConflicts ? "Checking…" : "Check for conflicts"}
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Creating…" : "Create event"}</Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
