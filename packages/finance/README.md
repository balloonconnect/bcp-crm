# @bcp/finance

Pure logic for vendors, expenses & profit: the 11-category vendor
registry, event/studio profit computation, receivables/payables
aggregation, GST/TDS math, and validation. Like `@bcp/equipment` and
`@bcp/team`, no database access — `apps/api` gathers real invoice/
expense/bill data and hands it to these functions.

## What's here

```
src/
  vendor-categories.ts     VENDOR_CATEGORIES (11 categories)
  profit.ts                  computeEventGrossProfit(), computeNetProfit(),
                            computeStudioProfitSummary() — the same
                            functions used at both the event and studio level
  receivables-payables.ts     computeReceivables(), computePayables()
  tax.ts                       computeGstAmount(), computeTdsAmount(),
                            computeVendorBillTotal()
  validation.ts                 vendorInputSchema, expenseInputSchema,
                            vendorBillInputSchema, purchaseOrderInputSchema, etc.
  index.ts                      barrel export
```

See [docs/vendors-expenses-profit.md](../../docs/vendors-expenses-profit.md)
for the full design — why purchase orders are deliberately single-line,
how event vs. general expense is just an optional FK rather than a type
flag, and why receivables/payables are always a current snapshot rather
than date-filtered.

## Testing

```bash
pnpm --filter @bcp/finance test
pnpm --filter @bcp/finance typecheck
pnpm --filter @bcp/finance lint
```
