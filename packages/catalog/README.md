# @bcp/catalog

Pure logic for the services & packages catalog: the 16-service default
registry, validation, studio-only cost/margin math, and — the one thing
that matters most in this package — the internal/customer-facing
pricing separation rule. Like `@bcp/leads` and `@bcp/clients`, no
database access — `apps/api` and `apps/studio-web` both import from
here.

## What's here

```
src/
  default-services.ts   DEFAULT_SERVICES (16 services), SERVICE_CATEGORIES
  validation.ts          serviceInputSchema, packageInputSchema,
                         validatePaymentScheduleTotal()
  customer-view.ts        buildCustomerFacingPackageView() — THE
                         enforcement point for "internal service prices
                         never appear to a customer unless the studio
                         explicitly enables item-level pricing"
  internal.ts             computeInternalPackageCost(), computePackageMargin()
                         — studio-only, never part of the customer view
  index.ts                barrel export
```

See [docs/services-and-packages.md](../../docs/services-and-packages.md)
for the full design — why a package's customer-facing total is
independent of summed service costs, how `PackageService` snapshots
prices at build time, and what's a deliberate v1 simplification (no
line-item-linked quotations yet, simple discount ceiling rather than a
rules engine).

## The pricing rule, tested directly

`src/__tests__/customer-view.test.ts` doesn't just check that a field is
`undefined` when item-level pricing is off — it serializes the built
view to JSON and asserts the actual internal price figures don't appear
anywhere in the output. That's the test worth reading first if you're
touching this package.

## Testing

```bash
pnpm --filter @bcp/catalog test
pnpm --filter @bcp/catalog typecheck
pnpm --filter @bcp/catalog lint
```
