# @bcp/equipment

Pure logic for equipment management: the 15-category registry,
checkout-overlap detection (the double-booking prevention the brief
requires), warranty/insurance expiry tracking, and asset valuation.
Like `@bcp/team` and `@bcp/events`, no database access — `apps/api`
gathers real checkout/equipment data and hands it to these functions.

## What's here

```
src/
  categories.ts    EQUIPMENT_CATEGORIES (15 categories)
  checkout.ts        checkCheckoutConflict() — mirrors @bcp/events'
                    detectEquipmentConflicts logic, applied to
                    open-ended checkout windows instead of event slots
  expiry.ts           resolveExpiryUrgency(), findExpiringEquipment()
                    — computed live, never a scheduled job
  financials.ts        computeEquipmentValuation() — prefers
                    replacement cost over purchase price per item
  validation.ts         equipmentInputSchema, checkoutInputSchema,
                    damageReportInputSchema, etc.
  index.ts              barrel export
```

See [docs/equipment-management.md](../../docs/equipment-management.md)
for the full design — why three different "who has this" models
coexist without replacing each other, and why checkout conflicts are a
hard block while event-scheduling conflicts (Prompt 18) are only a
warning.

## Testing

```bash
pnpm --filter @bcp/equipment test
pnpm --filter @bcp/equipment typecheck
pnpm --filter @bcp/equipment lint
```
