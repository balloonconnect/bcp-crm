"use client";

import * as React from "react";
import { apiGet } from "./api-client";

export interface EventRecord {
  id: string;
  title: string;
  eventType: string;
  status: string;
  editingStatus: string;
  scheduledAt: string;
  endAt: string | null;
  venue: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  dressNotes: string | null;
  travelNotes: string | null;
  accommodationNotes: string | null;
  internalNotes: string | null;
  deliverables: string[];
  client: { id: string; name: string } | null;
  assignments: { studioUserId: string; studioUser: { id: string; name: string } }[];
}

interface EventsContextValue {
  events: EventRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EventsContext = React.createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<EventRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<EventRecord[]>("/events");
    if (res.ok && res.data) {
      setEvents(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load events");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return <EventsContext.Provider value={{ events, loading, error, refetch }}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsContextValue {
  const ctx = React.useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within an <EventsProvider>");
  return ctx;
}

/** Mobile defaults to Agenda per the brief — checked once on mount via a media query rather than tracked continuously, since the view choice shouldn't jump around if someone resizes a desktop window. */
export function useDefaultView(): "agenda" | "list" {
  const [defaultView, setDefaultView] = React.useState<"agenda" | "list">("list");
  React.useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setDefaultView("agenda");
  }, []);
  return defaultView;
}
