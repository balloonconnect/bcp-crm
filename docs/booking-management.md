# Booking management

Converts an accepted quotation into a booking — built across
`@bcp/bookings` (11-stage pipeline, pricing/margin computation, and the
timeline-entry registry), `apps/api`'s booking services and routes, and
`apps/studio-web`'s `/bookings` page.

## The Booking as the "spine"

`Booking` ties an accepted `Quotation` to everything that follows: the
`Event`s it covers (a booking can span several — an engagement shoot, the
wedding itself, and a reception, all under one booking), the assigned
team, the payment schedule, and — through those events — the production
pipeline (galleries, albums, print orders, deliveries). It deliberately
doesn't duplicate what `Event`/`Gallery`/`Album`/`PrintOrder`/`Delivery`
already track per-shoot; `Booking.status` is the studio's explicit,
authoritative read of the overall engagement's stage, not a value
mechanically derived from child records.

`Quotation.convertQuotationToBooking()` (extended from Prompt 16, which
originally only created an `Event`) now creates the real `Booking`:
line items and the payment schedule are **snapshotted** from the
quotation at conversion time (same "copy, don't reference" rationale as
every other snapshot in this codebase — a booking already in progress
shouldn't change if the source quotation is edited afterward), and the
linked `Event` is created or confirmed and pointed at the new booking
via `Event.bookingId`.

## Fields

Every field in the brief maps directly: `bookingNumber` (studio-unique,
`B-2026-0001` pattern, same as quotation numbering), `client`/`package`
(direct FKs), `events` (`Event.bookingId`, one-to-many), `services`
(`BookingLineItem`, snapshotted), `deliverables` (string array, also
snapshotted from the quotation/package), `assignedTeam`
(`BookingTeamAssignment` — booking-level, distinct from `EventAssignment`
which is per-shoot; a booking's videographer might work every event in
it, so assigning once here is simpler than re-assigning per event, though
per-event overrides remain possible), `paymentSchedule`
(`BookingPaymentScheduleItem` — the *plan*, with its own milestone
status distinct from `Invoice`/`ClientPayment` which track money
actually invoiced and received), `contract` (`ClientContract`, linked
via `Booking.contractId`), `notes`, and `internalCost`/`sellingPrice`/
`estimatedProfit` (paise, resolved at conversion time from the
quotation's own already-computed figures — `@bcp/bookings`'
`computeBookingCostSummary()` exists for the less common case of
recomputing from the booking's own line items after a manual edit, via
`POST /bookings/:id/recompute-cost`).

## Statuses & workflow

11 stages (`@bcp/bookings`' `BOOKING_STAGES`), roughly following a real
booking's life: money first (draft → awaiting advance → confirmed), the
shoot itself (in progress), then post-production (editing → client
selection → album design → printing → delivery), then done — with
`cancelled` reachable from any open stage rather than slotted into the
linear sequence.

`canTransition()` only blocks one thing: moving out of a closed
(`completed`/`cancelled`) booking. From any open stage, a studio can move
to any other open stage or `cancelled` — real bookings fall through in
ways that don't fit a strict linear sequence (a client postpones
indefinitely, a studio corrects a stage set too early), and forcing every
intermediate stage first would just encourage working around validation
rather than using it. `getNextStage()` is what the UI uses to offer the
pipeline's *default* one-click "advance" action.

## Visual timeline and workflow

Two distinct pieces, both named in the brief:

- **Workflow** (`WorkflowStepper`, `apps/studio-web`): a horizontal
  stepper showing the 10 open-pipeline stages (`cancelled` excluded —
  shown as a status badge instead, since a cancelled booking didn't
  progress through the remaining stages), with completed stages
  checked, the current one highlighted, and only the *next* stage
  clickable to advance.
- **Timeline** (`booking-timeline.service.ts`'s `getBookingTimeline()`):
  a chronological feed composed from the booking's own audit history
  plus everything that happens across its linked events (shoots,
  galleries, albums, print orders, deliveries) and its contract — same
  "aggregate from tables that already exist" approach as the lead and
  client timelines. Payments aren't included directly, to avoid
  double-counting across a booking's several events; the payment
  *schedule* (the plan) is already visible elsewhere on the booking.

## Payment milestone status

`BookingPaymentScheduleItem.status` is refreshed on every read
(`resolveMilestoneStatus()` — a `pending` milestone whose due date has
passed flips to `overdue`) rather than depending on a scheduled job or
someone remembering to update it manually.

## Testing

```bash
pnpm --filter @bcp/bookings test   # pipeline, pricing, and timeline registry
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /bookings, including the workflow stepper
```
