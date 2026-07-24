"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { useEvents, type EventRecord } from "../../lib/events-context";

function mapsUrl(event: EventRecord): string {
  if (event.latitude != null && event.longitude != null) return `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
  const query = [event.venue, event.addressLine1, event.addressCity].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Groups events by city and links each to Google Maps rather than
 * embedding an interactive map — an embedded map needs a Google Maps/
 * Mapbox API key this environment doesn't have configured. This is a
 * deliberate v1 simplification: real venue coordinates are still
 * captured on the event (`latitude`/`longitude`) and used here whenever
 * present, so swapping in an embedded map later is additive, not a
 * rework.
 */
export function EventsMapView({ onOpen }: { onOpen: (event: EventRecord) => void }) {
  const { events } = useEvents();
  const withLocation = events.filter((e) => e.venue || e.addressCity || (e.latitude != null && e.longitude != null));

  const byCity = new Map<string, EventRecord[]>();
  for (const event of withLocation) {
    const city = event.addressCity ?? "Other";
    byCity.set(city, [...(byCity.get(city) ?? []), event]);
  }

  if (withLocation.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">No events with a venue or address yet.</p>;

  return (
    <div className="flex flex-col gap-6">
      {[...byCity.entries()].map(([city, cityEvents]) => (
        <div key={city}>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {city}
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {cityEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 p-3">
                <button type="button" onClick={() => onOpen(event)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.venue ?? event.addressLine1}</p>
                </button>
                <a href={mapsUrl(event)} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-xs text-brand underline">
                  Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
