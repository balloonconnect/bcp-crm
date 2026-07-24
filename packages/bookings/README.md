# @bcp/bookings

Pure logic for booking management: the 11-stage pipeline (with a
deliberately permissive transition model — see `docs/booking-management.md`
for why), pricing/margin computation, payment-milestone overdue
resolution, and the timeline-entry type registry. Like `@bcp/quotations`
and `@bcp/catalog`, no database access — `apps/api` and
`apps/studio-web` both import from here.

## What's here

```
src/
  pipeline.ts       BOOKING_STAGES (11 stages), canTransition(),
                    getNextStage(), WORKFLOW_STAGE_KEYS (for the stepper)
  pricing.ts         computeBookingCostSummary(), resolveMilestoneStatus()
  validation.ts       bookingUpdateSchema, bookingStatusChangeSchema,
                    teamAssignmentSchema, paymentMilestoneUpdateSchema
  timeline.ts         BOOKING_TIMELINE_EVENT_TYPES — icon/label lookup
                    for the visual timeline
  index.ts            barrel export
```

See [docs/booking-management.md](../../docs/booking-management.md) for
the full design — how a booking snapshots its source quotation, the
workflow stepper vs. timeline distinction, and booking-level vs.
per-event team assignment.

## Testing

```bash
pnpm --filter @bcp/bookings test
pnpm --filter @bcp/bookings typecheck
pnpm --filter @bcp/bookings lint
```
