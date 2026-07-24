# @bcp/invoicing

Pure logic for invoice, receipt & payment management: financial-year
resolution, branch/FY-aware document numbering, GST split (CGST/SGST/
IGST), discount, outstanding calculation, and the payment method
registry. Like `@bcp/finance` and `@bcp/equipment`, no database access —
`apps/api` gathers real invoice/payment data and hands it to these
functions.

Named `@bcp/invoicing` rather than the more obvious `@bcp/billing`
because that name already belonged to Prompt 6's platform subscription/
licensing package — see
[docs/invoice-receipt-payments.md](../../docs/invoice-receipt-payments.md)
for how that near-collision was caught and fixed.

## What's here

```
src/
  financial-year.ts   resolveFinancialYear() — India's Apr–Mar FY
  numbering.ts           buildDocumentNumber() — branch + FY aware
  gst.ts                   computeGstSplit() — CGST+SGST vs IGST
  discount.ts               computeDiscountAmount()
  outstanding.ts             computeInvoiceTotals() (composes
                          discount + GST in order), computeOutstanding(),
                          resolveInstallmentStatus()
  payment-methods.ts          PAYMENT_METHODS (7 + other),
                          requiresGatewayReference()
  validation.ts                invoiceInputSchema, paymentInputSchema,
                          creditNoteInputSchema, refundReceiptInputSchema
  index.ts                     barrel export
```

## Testing

```bash
pnpm --filter @bcp/invoicing test
pnpm --filter @bcp/invoicing typecheck
pnpm --filter @bcp/invoicing lint
```
