# Event & calendar management

Full shoot-day detail on `Event`, an equipment catalog with double-
booking detection, per-event services, shot lists, and intra-day
schedules — built across `@bcp/events` (standard event types, conflict
detection, validation, view-grouping helpers) and `apps/api`/
`apps/studio-web`'s `/events` page.

## Event types

The 13 types named in the brief (`@bcp/events`' `EVENT_TYPES`) are picker
suggestions, not a database enum — `Event.eventType` stays free text for
consistency with `Lead.eventType`/`Package.eventType`, which were
already free text before this phase. Choosing "Custom" lets a studio
type anything.

## Details

Every field in the brief lives directly on `Event`: client, date/time
(`scheduledAt`/`endAt`), venue, structured address
(`addressLine1`/`addressCity`/`addressState`/`addressPostalCode`) plus
`latitude`/`longitude` for the map view and external map links, contact
person, team (`EventAssignment`, existing since Prompt 11), services
(`EventService` — usually a subset of the parent Booking's line items,
scoped to what this specific shoot delivers), equipment
(`EventEquipment`), shot list (`EventShotListItem` — deliberately just a
description and a completed flag, not a structured shot-type taxonomy,
since studios' shot lists vary too much in style to force into fixed
fields), event-day timeline (`EventScheduleItem` — "10:00 AM hair &
makeup," distinct from the studio-wide Calendar/Agenda/Timeline *views*
below, which are how events themselves are browsed), dress/travel/
accommodation notes, deliverables, and internal notes.

## Equipment

`Equipment` is a resource catalog the same way `Service` is a sellable-
item catalog, except equipment isn't sold — it's assigned to events and
checked for double-booking. `quantity` is how many units a studio owns;
a conflict only fires once concurrent demand exceeds that number (two
events both wanting 1 of 3 owned tripods isn't a conflict; two events
both wanting 2 of 3 is).

## Views

Six views, one page (`/events`), a shared `EventsProvider` fetching once:

- **List** — `ResponsiveDataView`, sortable/filterable table+card hybrid.
- **Agenda** — day-grouped, via `@bcp/events`' `groupEventsForAgenda()`.
  **Mobile's default view**, per the brief — detected once on mount via
  `matchMedia("(max-width: 640px)")` rather than tracked continuously,
  so the view choice doesn't jump around if someone resizes a desktop
  window.
- **Calendar** — a real month grid with prev/next navigation.
- **Timeline** — one continuous chronological line through every event
  (past and upcoming), distinct from Agenda's day-grouped cards — useful
  for seeing a season's flow at a glance rather than picking a specific
  day.
- **Kanban** — grouped by `Event.status`, via `@bcp/events`'
  `groupEventsForKanban()`.
- **Map** — groups events by city with a link out to Google Maps per
  event (using real lat/lng when captured, falling back to the venue/
  address text otherwise), rather than an embedded interactive map — see
  "Known simplifications" below.

## Conflict detection

Four checks named in the brief, all in `@bcp/events`' `conflicts.ts`,
all pure functions (`apps/api`'s `checkEventConflicts()` gathers the
candidate data from the database; the actual overlap logic has no
database dependency and is unit-tested directly):

- **Team**: the same `StudioUser` assigned to two events with
  overlapping time windows.
- **Equipment**: the same `Equipment` item's concurrent demand exceeding
  how many units the studio owns.
- **Date and time**: two events at the same venue with overlapping time
  windows — a plain double-booking of the same physical location,
  independent of who's assigned.
- **Travel overlap**: distinct from a plain team conflict — two events
  at *different* venues without enough gap between them for the same
  person to realistically travel (a configurable buffer, 90 minutes by
  default) are flagged even if their windows don't strictly overlap;
  two events at the *same* venue back-to-back are fine and not flagged.

None of these hard-block saving an event — a studio might genuinely
want to double-book a team member across two small, nearby events.
They're surfaced (`POST /events/check-conflicts`, and automatically
reflected in the create-event form) so a human decides, not enforced as
validation errors.

## Known simplifications

- **Map view** links out to Google Maps rather than embedding an
  interactive map — an embedded map needs a Google Maps/Mapbox API key
  this environment doesn't have configured. Real venue coordinates are
  still captured on the event and used whenever present, so adding an
  embedded map later is additive, not a rework.
- A shoot with no known `endAt` is treated as lasting a conservative
  default (3 hours) for conflict-checking purposes, long enough that
  back-to-back same-day bookings still get flagged for a human to
  check, rather than silently assumed to never conflict.

## Testing

```bash
pnpm --filter @bcp/events test   # event types, conflict detection, validation, view helpers
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /events, all six views
```
