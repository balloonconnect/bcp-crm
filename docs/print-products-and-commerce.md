# Print products and commerce

A full commerce layer on top of the gallery/photo infrastructure —
softcopies through gift products, size/finish/quantity pricing,
event-specific pricing overrides, studio-owned coupons, shipping,
courier tracking, tax, online/manual payment, order status,
fulfilment, lab export, and original-file download for lab fulfilment.
Built across `@bcp/commerce` (pricing resolution, coupon validation,
order totals, commission, lab export — all pure), and `apps/api`'s
product/coupon management and order services.

## The 9 product categories, and why variants exist

`Product` covers softcopy, print, album, frame, canvas, acrylic,
calendar, photo_book, and gift — every category named in the brief.
`ProductVariant` is where "Size"/"Finish"/"Quantity" tiers each get
their own price, since a product itself (e.g. "Canvas Print") is
really a family of purchasable variants, not one fixed price point.

## Price resolution is by specificity, never averaged

`resolveUnitPrice()` checks exactly three things in order: an
event-specific override (`EventProductPricing` — a wedding package's
bundled prints, priced differently from the same product sold
standalone) wins outright; otherwise a selected variant's own price
wins over the product's base price. Exactly one of the three numbers
is the real price for any given line item.

## Coupons are entirely studio-owned

Consistent with this codebase's established pattern (contract
templates, email/WhatsApp templates, culling presets) — there is no
platform-wide coupon. `validateCoupon()` reports a distinct reason for
every way a coupon can fail (inactive, not yet valid, expired, usage
limit reached, category mismatch) rather than one generic "invalid"
message, since a client should see a different explanation for each.

## Order totals: discount → tax (including shipping) → total → commission

`computeOrderTotals()` is the one function every order's numbers come
from: subtotal minus a clamped discount (never negative), tax computed
on the discounted amount plus shipping, then platform commission
computed *on top of* the total a client actually pays — commission is
what the platform takes from a studio's earnings, never an extra
charge added onto what a client sees.

## Zero platform commission by default, genuinely configurable

`PlatformCommerceSettings` is a real singleton with `commissionEnabled`
defaulting to `false` and `commissionPercent` defaulting to `0`.
`resolveCommissionPercent()` is the one gate every order's commission
passes through: even if a percentage is configured in advance,
disabled always resolves to a hard 0 — a platform admin can raise the
number ahead of turning it on without any order being affected until
`commissionEnabled` itself flips. Every order snapshots the commission
percent and paise amount it was actually charged at
(`CommerceOrder.platformCommissionPercent`/`platformCommissionPaise`),
so a later platform-wide fee change never retroactively reinterprets
an already-placed order's economics — the same "snapshot, don't just
reference" instinct `CullingSession.priorityWeights` and
`Invoice.gstRatePercent` already established elsewhere.

## Online payment, manual payment — one model, one distinction

`CommercePayment.method` reuses the exact same `PaymentMethod`
vocabulary (razorpay, cashfree, cash, UPI, bank transfer, etc.)
invoices already use — "online" vs. "manual" is just whether that
method happens to be a gateway, not a second parallel payment system.
An order transitions to `paid` automatically once its payments sum to
the total.

## Lab export and original download for lab fulfilment

`buildLabExportCsv()` produces one row per order item with every
photo-based item's true original storage key — resolved from
`GalleryPhoto.fileKey`, never a compressed or watermarked variant a
lab would print at visibly reduced quality. A missing original is
flagged as `MISSING` in the export rather than left as a blank a lab
operator could miss.

## Testing

```bash
pnpm --filter @bcp/commerce test   # pricing, coupons, order totals, commission, lab export, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /products catalog + coupons, /commerce-orders management
```
