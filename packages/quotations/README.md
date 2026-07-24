# @bcp/quotations

Pure logic for quotation management: the 7-status pipeline (with
allowed-transition rules), pricing computation (subtotal → discount →
GST → total, plus internal cost, all independent of any database), and
— extended directly from `@bcp/catalog`'s package rule — the
customer-facing pricing separation rule applied to quotations. Like
`@bcp/catalog`, no database access — `apps/api`, `apps/studio-web`, and
`apps/client-portal` all import from here.

## What's here

```
src/
  pipeline.ts        QUOTATION_STAGES (7 stages), canTransition() —
                     which status moves are actually allowed
  pricing.ts          computeQuotationTotals(), computeQuotationMargin()
  customer-view.ts     buildCustomerFacingQuotationView() — the
                     enforcement point for "internal service prices
                     never appear in customer PDFs or WhatsApp messages
                     unless item-level pricing is explicitly enabled,"
                     structurally identical to @bcp/catalog's package
                     version
  validation.ts        quotationInputSchema, approvalSchema,
                     otpRequestSchema/otpVerifySchema, etc.
  index.ts             barrel export
```

See [docs/quotation-management.md](../../docs/quotation-management.md)
for the full design — how a quotation snapshots a Package's line items,
the OTP-gated approval flow, revision history, and what's a deliberate
v1 simplification (no PDF email attachments, WhatsApp send degrades
gracefully without real Business API credentials).

## The pricing rule, tested directly

`src/__tests__/customer-view.test.ts` follows the same pattern as
`@bcp/catalog`'s equivalent suite — it serializes the built view to JSON
and asserts the actual internal price figures don't appear anywhere in
it when item-level pricing is off, not just that a field is `undefined`.

## Testing

```bash
pnpm --filter @bcp/quotations test
pnpm --filter @bcp/quotations typecheck
pnpm --filter @bcp/quotations lint
```
