# Vendors, expenses & profit

Expands the Prompt 11 minimal `Expense` record into full vendor and
expense management, plus the studio's profit/receivables/payables
picture — built across `@bcp/finance` (vendor category registry, profit
computation, receivables/payables aggregation, GST/TDS math,
validation) and `apps/api`/`apps/studio-web`'s `/vendors`, `/expenses`,
and `/finance` pages.

## Vendor categories

The 11 categories named in the brief (`@bcp/finance`'s
`VENDOR_CATEGORIES`) are picker suggestions, not a database enum —
`Vendor.category` stays free text, the same convention as
`Equipment.category`/`Event.eventType`.

## Event expense vs. general expense

Not a separate field — just whether `Expense.eventId`/`bookingId` is
set, the same optional-FK convention used throughout this codebase
rather than a redundant type flag that could disagree with the FK
itself.

## Purchase orders & vendor bills

`PurchaseOrder` is deliberately single-line (a description and an
amount, not a full line-item breakdown like `Quotation`/`Booking`) —
most of a photography studio's POs to a vendor (album covers, a courier
run) are single-line in practice; multi-line POs are a reasonable
future addition if a studio's vendor relationships grow complex enough
to need it. `VendorBill` is the payable-side mirror of `Invoice` —
money the studio owes a vendor rather than a client owing the studio —
with the same GST/TDS fields `Expense` and `Quotation` already use.

## Receipt upload, approval, recurring, payment status

- **Receipt upload**: `Expense.receiptFileKey`, the same `@bcp/storage`
  object-key convention as every other attachment in this codebase.
- **Approval**: `Expense.approvalStatus` defaults to `not_required` —
  a studio without an approval workflow shouldn't have every expense
  blocked pending sign-off by default; requesting approval is an
  explicit opt-in per expense (`requireApproval` on create).
- **Recurring**: spawns its next occurrence the moment the current one
  is marked handled (`POST /expenses/:id/spawn-next`), reusing
  `@bcp/workflow`'s `computeNextOccurrence()` directly rather than
  duplicating the calendar-arithmetic logic — same "spawn on
  completion, not a timer" approach `tasks.service.ts` uses for
  recurring tasks.
- **Payment status**: `unpaid → partially_paid → paid`, tracked
  independently of approval — an expense can be approved and still
  unpaid, or (rarely) paid before formal approval catches up.

## GST & TDS

`computeGstAmount()` adds GST on top of a taxable amount (money owed
increases); `computeTdsAmount()` computes what's *withheld* from a
payment to a vendor/freelancer (money paid out decreases, since TDS is
deducted at source and remitted separately) — opposite directions,
which is why they're two functions rather than one signed rate.

## Profit calculation

Two levels, computed by the *same* shared functions
(`computeEventGrossProfit()`/`computeNetProfit()`) so "this event's
profit" and "the studio's profit this month" are never computed by
different logic that could quietly disagree:

- **Event profit** (`GET /events/:id/profit`) — revenue is what's been
  invoiced for that specific event; cost is expenses explicitly tagged
  to it. Deliberately doesn't try to allocate a share of a parent
  Booking's `internalCost` per-event when an event is one of several
  under one booking — the Booking's own margin view (Prompt 17) already
  covers booking-level service cost; this is the event-level picture
  layered on top.
- **Studio financial summary** (`GET /finance/summary`) — revenue and
  cost are period-filterable (a date range); **receivables and
  payables are always a current snapshot**, never period-filtered,
  since "what's owed right now" isn't meaningful scoped to a date
  range the way revenue/cost are.

Receivables reuses the same unpaid-balance computation
`@bcp/clients`' `computeOutstandingAmount()` does per-client, applied
studio-wide. Payables sums unpaid `VendorBill`s and pending
`FreelancerPayment`s (Prompt 20) — the two sources of outgoing
obligation this codebase tracks.

## Testing

```bash
pnpm --filter @bcp/finance test   # vendor categories, profit, receivables/payables, tax, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /vendors, /expenses, /finance
```
