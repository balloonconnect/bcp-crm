# Invoice, receipt & payments

Expands the Prompt 11 minimal `Invoice`/`ClientPayment` records into
full billing and payment management — built across `@bcp/invoicing`
(financial-year/branch numbering, GST/CGST/SGST/IGST split, discount,
outstanding calculation, payment-method registry, validation) and
`apps/api`/`apps/studio-web`'s `/invoices` page.

## Package naming note

This phase's pure-logic package is `@bcp/invoicing`, not `@bcp/billing`
— `@bcp/billing` already existed (Prompt 6: subscription plan limits
and license lifecycle for the platform side). Similarly-named but
unrelated domains; kept separate rather than overloading one package
with two different meanings of "billing."

## Six documents, three models

The brief's 6 documents split into what they actually are:

- **Proforma invoice, tax invoice, non-GST invoice** — all
  `Invoice.documentType` values. Same numbering/GST/lifecycle
  machinery, differing only in tax treatment and legal status
  (proforma isn't a demand for payment; non-GST skips the tax fields
  entirely).
- **Receipt** — a separate model, `Receipt`, because it isn't an
  invoice at all. See "every payment generates one," below.
- **Credit note** — `CreditNote`, reduces what's owed on an
  already-issued invoice without editing the original (which stays an
  immutable record of what was originally billed).
- **Refund receipt** — `RefundReceipt`, money actually returned —
  distinct from a credit note the same way a `ClientPayment` is
  distinct from an `Invoice`: one is the obligation, the other is real
  money movement.

## Numbering: automatic, branch-aware, financial-year-aware

`@bcp/invoicing`'s `buildDocumentNumber()` produces
`INV/MUM/2026-27/0001` (with a branch code) or `INV/2026-27/0001`
(without) — each document type (Invoice, Receipt, CreditNote,
RefundReceipt) has its own independent sequence, not a shared counter.
`resolveFinancialYear()` implements India's April–March fiscal year;
GST compliance specifically expects invoice sequences to be traceable
per financial year, which is why this is a full FY string rather than
the flat incrementing counts simpler documents elsewhere in this
codebase (Quotation, Booking, PurchaseOrder) use.

## GST: CGST, SGST, IGST

`computeGstSplit()` implements standard Indian GST mechanics, not a
studio-specific policy: intra-state splits the rate evenly into CGST +
SGST; inter-state applies the full rate as IGST. `Invoice.isInterState`
is the one flag that decides which.

## Installments, partial payment, advance payment, outstanding

`InvoiceInstallment` is the invoice's own payment *plan* — mirrors
`QuotationPaymentScheduleItem`/`BookingPaymentScheduleItem`'s shape,
the third appearance of the same pattern at a different pipeline
stage. `ClientPayment` rows are money actually received, independent
of the plan. `computeOutstanding()` is the one place "what's still
owed" is computed — a cancelled invoice always owes nothing regardless
of its billed total. An advance payment and a partial payment are the
same mechanism (a `ClientPayment` recorded before the balance is fully
paid); nothing distinguishes them structurally, since "advance"
is a description of *when* it happened, not a different kind of
payment.

## Every payment generates a receipt — automatically

The brief's one hard rule. `recordPayment()` creates the
`ClientPayment` and its `Receipt` in the **same database transaction**
— never as an optional follow-up step a studio has to remember. The
invoice's `status`/`amountPaid` are re-derived from the sum of all its
payments afterward, never from a value the caller passed in directly.

## PDF, email, WhatsApp, print

`invoice-pdf.service.ts` generates both invoice and receipt PDFs via
`pdfkit` — the same library already used for quotation PDFs (Prompt
16). `invoice-distribution.service.ts` sends by email (always works,
`sendAuthEmail`) or WhatsApp (degrades gracefully — logs, no throw —
when no Business API credentials are configured, the same pattern
quotation distribution uses). "Print" isn't a separate code path: a
generated PDF opened in a browser is printable natively, so there's
nothing additional to build there.

## Payment methods

Cash, UPI, card, bank transfer, cheque, Razorpay, Cashfree — a real
Prisma enum (`PaymentMethod`), not free text like most category-style
fields elsewhere in this codebase, because payment method drives real
logic (whether a gateway transaction reference applies) in a way a
vendor category never does. Razorpay/Cashfree payments carry
`gatewayProvider`/`gatewayTransactionId` reference fields — this phase
records the reference a gateway would return, not a live payment-
gateway integration (no API keys are configured in this environment).

## Testing

```bash
pnpm --filter @bcp/invoicing test   # FY resolution, numbering, GST split, discount, outstanding, payment methods
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /invoices
```
