# @bcp/events

Pure logic for event & calendar management: the 13 standard event types
(picker suggestions, not a database enum), the four-way conflict
detection engine (team/equipment/date-time/travel), validation, and the
view-grouping helpers the six calendar views share. Like `@bcp/bookings`
and `@bcp/quotations`, no database access — `apps/api` gathers candidate
data from the database and hands it to these functions; `apps/studio-web`
imports the same registries and helpers directly.

## What's here

```
src/
  event-types.ts    EVENT_TYPES (13 types) — the standard picker list
  conflicts.ts        windowsOverlap(), resolveEventWindow(),
                     detectTeamConflicts(), detectEquipmentConflicts(),
                     detectDateTimeConflicts(), detectTravelConflicts()
  validation.ts        eventInputSchema, equipmentInputSchema,
                     shotListItemSchema, scheduleItemSchema
  view-helpers.ts      groupEventsForAgenda(), groupEventsForKanban()
  index.ts             barrel export
```

See [docs/event-calendar-management.md](../../docs/event-calendar-management.md)
for the full design — how equipment conflicts account for owned
quantity, why travel conflicts use a buffer instead of requiring strict
overlap, and what's a deliberate v1 simplification (Map view links out
rather than embedding a map).

## Testing

```bash
pnpm --filter @bcp/events test
pnpm --filter @bcp/events typecheck
pnpm --filter @bcp/events lint
```
