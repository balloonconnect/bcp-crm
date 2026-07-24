# @bcp/commerce

Pure logic for print product commerce: price resolution (event
override → variant → base, by specificity), coupon validation with
distinct failure reasons, order-total computation (discount → tax →
total → commission), platform commission resolution (zero unless
explicitly enabled), order numbering, and lab-export CSV generation.
No database access — `apps/api`'s `products.service.ts` and
`commerce-orders.service.ts` do the actual reading/writing.

## What's here

```
src/
  products.ts             PRODUCT_CATEGORIES — the 9 categories
                         named in the brief
  pricing.ts                  resolveUnitPrice() — event override →
                         variant → base, exactly one wins
  coupons.ts                     validateCoupon() (5 distinct failure
                         reasons), computeCouponDiscount() (clamped,
                         never negative)
  order-totals.ts                   computeSubtotal(), computeOrderTotals() —
                         the one function every order's numbers
                         come from
  commission.ts                        resolveCommissionPercent() — 0
                         unless PlatformCommerceSettings.commissionEnabled
                         is true, regardless of the stored percent
  order-numbering.ts                      buildOrderNumber()
  lab-export.ts                              buildLabExportCsv() —
                         flags a missing original as MISSING, never a
                         silent blank
  validation.ts                                 productInputSchema,
                         couponInputSchema, createOrderSchema,
                         recordCommercePaymentSchema,
                         platformCommerceSettingsSchema, etc.
  index.ts                                       barrel export
```

See [docs/print-products-and-commerce.md](../../docs/print-products-and-commerce.md)
for the full design — why platform commission is a real, snapshotted
per-order value rather than a live reference, and how "zero by
default, configurable for later" is a genuine code path.

## Testing

```bash
pnpm --filter @bcp/commerce test
pnpm --filter @bcp/commerce typecheck
pnpm --filter @bcp/commerce lint
```
