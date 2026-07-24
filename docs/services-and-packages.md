# Services & packages catalog

A studio's sellable catalog — individual services and the packages
bundled from them — built across `@bcp/catalog` (default service
registry, validation, and the internal/customer-facing pricing
separation rule), `apps/api`'s catalog services and routes, and
`apps/studio-web`'s `/services` and `/packages` pages.

## Services

16 standard services from the brief are offered as one-click seed data
(`POST /services/seed-defaults`, `@bcp/catalog`'s `DEFAULT_SERVICES`) —
not a fixture. Every seeded row becomes a completely normal `Service` a
studio can rename, reprice, recategorize, or delete, indistinguishable
from one it created from scratch. Seeding is idempotent (skips any
default whose name the studio already has, case-insensitively), so it's
safe to click more than once.

## Packages

A `Package` bundles `Service`s (via `PackageService`, which **snapshots**
each service's internal price at the moment it's added —
`internalPriceSnapshot` — so editing a service's price later doesn't
silently rewrite the cost of packages already built from it), plus
optional `PackageAddOn`s and a `PackagePaymentScheduleItem` list.

The package's `customerFacingTotal` is a single number the studio sets
directly — **not** required to equal the sum of its services' internal
prices. A studio bundles and discounts deliberately; the catalog doesn't
second-guess that by deriving the customer price from cost.

## The core rule: internal pricing never leaks

> Internal individual service prices must not appear in customer PDFs or
> WhatsApp messages unless the studio explicitly enables item-level
> pricing.

This is enforced in exactly one place: `@bcp/catalog`'s
`buildCustomerFacingPackageView()`. Every customer-facing surface —
a quotation PDF, a WhatsApp summary, a client-portal package page —
is expected to call this function (via `apps/api`'s
`GET /packages/:id/customer-view`, the *only* sanctioned customer-safe
endpoint) rather than reading `PackageService.internalPriceSnapshot` or
`Service.internalPrice` directly. When `Package.itemLevelPricingEnabled`
is `false` (the default for every new package), the customer-facing
view still lists *what's* included — service names and quantities, since
a customer should always see what they're paying for — but never *what
each piece costs*. Flip the flag on, and per-service prices appear.

This is tested directly: `packages/catalog/src/__tests__/customer-view.test.ts`
includes a test that serializes the customer view to JSON and asserts
the internal price figures don't appear anywhere in it when the flag is
off — not just that a specific field is `undefined`.

Margin (`GET /packages/:id/margin`, `computeInternalPackageCost()` +
`computePackageMargin()`) is a completely separate, studio-only
endpoint — it is never reachable from anything a customer sees, and
doesn't share a response shape with the customer view.

The studio-web package detail view deliberately shows both — the
studio-only margin view and the customer-facing view, side by side,
with the item-level-pricing state visibly badged — so the rule's effect
is something a studio owner can actually see, not just trust.

## What's deliberately out of scope

This phase builds the catalog and the pricing-visibility rule that
governs it — not the PDF/WhatsApp generation and sending infrastructure
that would eventually call `buildCustomerFacingPackageView()`. Quotation/
Invoice records (Prompt 11) don't yet have line items pulled from a
Package; wiring a quotation to a package (so accepting a quotation
locks in the package's line items, add-ons, and payment schedule at that
moment) is a natural next step once quotation generation itself is
built out, not part of this phase.

Discount rules are intentionally simple in this phase — a package-level
`discountAllowed` flag and `maxDiscountPercent` ceiling, not a full rules
engine (seasonal/referral/early-bird conditions). Tax is similarly a
flat `taxRatePercent` + `taxInclusive` flag per package, not a
jurisdiction-aware tax table.

## Testing

```bash
pnpm --filter @bcp/catalog test    # includes the pricing-visibility rule's dedicated test suite
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # verifies /services and /packages compile and prerender
```
