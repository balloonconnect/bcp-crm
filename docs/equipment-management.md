# Equipment management

Expands `Equipment` (introduced minimally in Prompt 18 for per-event
booking) into a full asset register — built across `@bcp/equipment`
(category registry, checkout-overlap detection, expiry tracking,
valuation, validation) and `apps/api`/`apps/studio-web`'s `/equipment`
page.

## Categories

The 15 categories named in the brief (`@bcp/equipment`'s
`EQUIPMENT_CATEGORIES`) are picker suggestions, not a database enum —
`Equipment.category` stays free text, the same "seed-data, not a
fixture" convention as `Event.eventType`/`@bcp/catalog`'s
`DEFAULT_SERVICES`.

## Three different "who has this" models — none replace the others

A studio can use any subset of these, depending on how formally it
wants to track its gear:

- **`EventEquipment`** (Prompt 18) — a per-shoot booking, checked for
  double-booking against `Equipment.quantity` at event-scheduling time.
- **`TeamEquipmentAssignment`** (Prompt 20) — long-term custody: "this
  camera is generally Rahul's."
- **`EquipmentCheckoutRecord`** (this phase) — the short-term,
  QR-code-driven "who has this *right now*" transactional log, with an
  expected return time. This is what the brief's "Check-in"/"Checkout"
  and "Prevent equipment double-booking" actually refer to.

## Double-booking prevention

`@bcp/equipment`'s `checkCheckoutConflict()` mirrors the exact logic
`@bcp/events`' `detectEquipmentConflicts` uses for per-event bookings
(Prompt 18) — a conflict only fires once concurrent demand exceeds
`Equipment.quantity` — applied here to open-ended checkout windows
instead of fixed event slots. A checkout with no expected return and
not yet checked in is treated as ongoing and always conflicting, since
there's no way to know when it'll free up. `POST /equipment/:id/checkout`
returns `409 EQUIPMENT_DOUBLE_BOOKED` with the specific conflicting
checkout IDs when this fires — a hard block here, unlike the softer
"surface a warning" approach Prompt 18 took for scheduling a whole
event, because checking out a specific physical item that's already out
is a plain factual impossibility, not a judgment call a studio might
reasonably override.

## QR code

Each `Equipment` row gets a `qrCodeToken` (opaque, not the row's UUID,
so a printed label doesn't leak an internal database ID) generated at
creation. `GET /equipment/:id/qr` renders it as a PNG via the same
`qrcode` package the enquiry form (Prompt 13) and quotations (Prompt
16) already use for their own QR/share flows.

## Maintenance, repair, rental, damage

Four separate history logs, each intentionally minimal:

- **Maintenance** (`EquipmentMaintenanceRecord`) — routine/cleaning/
  calibration/firmware entries, with an optional `nextDueAt` for
  scheduling the next service.
- **Repair** (`EquipmentRepairRecord`) — status-tracked
  (reported → in_repair → resolved/unrepairable); reporting one sets
  the equipment's `currentStatus` to `in_repair` automatically, and
  resolving it sets the equipment back to `available`.
- **Rental** (`EquipmentRentalRecord`) — deliberately bidirectional
  (`direction: rented_out | rented_in`) rather than two separate
  models, since a studio renting a specialty lens in for one job and
  renting a spare body out to another studio are the same shape of
  record.
- **Damage** (`EquipmentDamageReport`) — a severity, description, and
  optional photos; reporting one sets the equipment's `condition` to
  `damaged`.

## Financial fields

`purchasePrice`, `replacementCost`, `warrantyExpiresAt`,
`insurancePolicyNumber`, `insuranceExpiresAt` are plain descriptive
fields on `Equipment`. The studio-wide overview
(`GET /equipment/overview`) computes total insured/replacement value
(`computeEquipmentValuation()` — prefers replacement cost over purchase
price per item, since that's what it'd actually cost to replace today)
and flags anything with a warranty or insurance policy expiring within
30 days or already lapsed (`findExpiringEquipment()`) — both computed
live on every read, the same "resolve on read" pattern used for SLA
tracking (Prompt 19) and payment milestones (Prompt 17).

## Testing

```bash
pnpm --filter @bcp/equipment test   # categories, checkout conflicts, expiry, valuation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /equipment
```
