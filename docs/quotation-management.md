# Quotation management

The full quotation lifecycle — build, send, track, digitally approve,
and convert to a booking — built across `@bcp/quotations` (status
pipeline, pricing computation, and the customer-facing pricing
separation rule extended from Prompt 15), `apps/api`'s quotation
services and routes, `apps/studio-web`'s `/quotations` page, and
`apps/client-portal`'s public `/quote/[token]` page.

## From the catalog to a quotation

A quotation is either built from a `Package` (its services and add-ons
are copied onto the quotation as `QuotationLineItem` rows, each
service's `internalPrice` **snapshotted at that moment** — editing the
source Package or a `Service`'s price afterward never rewrites a
quotation already sent) or built line-by-line from scratch. Either way,
`computeQuotationTotals()` (`@bcp/quotations`) is the one place subtotal,
discount, GST, total, and internal cost are derived — the same function
whether the quotation came from a package or not.

## The pricing-visibility rule, extended

Prompt 15's rule — *"internal individual service prices must not appear
in customer PDFs or WhatsApp messages unless the studio explicitly
enables item-level pricing"* — is the quotation's rule too, not a
separate one. `Quotation.itemLevelPricingEnabled` defaults from the
source Package when built from one, and `@bcp/quotations`'
`buildCustomerFacingQuotationView()` is the single enforcement point,
structurally identical to `@bcp/catalog`'s `buildCustomerFacingPackageView`.
Every customer-facing surface goes through it:

- **PDF** (`quotation-pdf.service.ts`, via `pdfkit`) renders *only* from
  the customer-facing view — it cannot leak an internal price because it
  never has access to the raw line items.
- **The public web link** (`apps/client-portal`'s `/quote/[token]`) reads
  from the same view via `GET /public/quotations/:token`.
- **Email / WhatsApp** send the public link itself, not quotation
  content inline — so there's nothing for those channels to leak in the
  first place. (`@bcp/email`'s client doesn't support attachments, so a
  PDF isn't auto-attached; the link's own page offers a PDF download —
  see "Known simplifications" below.)

## Statuses

7 stages (`@bcp/quotations`' `QUOTATION_STAGES`): draft → sent → viewed →
accepted → converted, with rejected/expired as the other two closed
states. `canTransition()` enforces which moves are valid — a rejected
quotation can't un-reject itself back to "sent," and "viewed" is a
**system-driven** transition (set automatically the first time the
public link is opened — see `recordQuotationView()`), not a status a
studio picks from a dropdown.

## Functions

- **PDF**: `GET /quotations/:id/pdf` (studio, authenticated) and
  `GET /public/quotations/:token/pdf` (public) both call the same
  `generateQuotationPdf()`.
- **Responsive web link**: `apps/client-portal`'s `/quote/[token]` —
  applies the studio's real brand theme (same `themeToCssVariables()`
  pattern the enquiry form page uses), not a generic template.
- **Email / WhatsApp**: `quotation-distribution.service.ts`. WhatsApp
  degrades gracefully (logs, doesn't throw) when no
  `WHATSAPP_API_URL`/`WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`
  are configured — the same "no provider configured" pattern the
  marketing site's analytics loader uses, appropriate for a local/dev
  environment without real WhatsApp Business credentials.
- **OTP access**: gates the *accept/reject* action, not viewing itself —
  anyone with the link can see the quotation (the same trust model a
  PDF or a printed quote already has), but confirming a decision
  requires proving contact ownership via a 6-digit code
  (`@bcp/auth`'s `generateEmailOtp`/`verifyEmailOtp`, reused as-is) sent
  to the email or phone on file. Codes are scoped to the quotation via
  `QuotationAccessCode`, not to a platform actor — the recipient is
  often a lead with no account at all.
- **Accept / Reject / Digital approval**: `QuotationApproval` captures
  the decision, a typed name as a lightweight e-signature, whether OTP
  verified the action, and the same IP/timestamp/user-agent audit trail
  a view gets.
- **Revision history**: `QuotationRevision` stores a full snapshot (not
  a diff) on every meaningful edit, so viewing any past revision never
  depends on replaying changes in order.
- **Clone**: copies a quotation's line items, payment schedule, and
  pricing into a new draft with a fresh number and public token.
- **Convert to booking**: only from `accepted`; creates (or confirms an
  existing) `Event`, marks the quotation `converted`, and moves a linked
  lead to `won`.
- **View tracking / IP and timestamp audit**: one model,
  `QuotationView` — every open of the public link is both at once, not
  two separate features.

## Mobile: sticky accept/reject bar

`apps/client-portal`'s quotation page shows Accept/Reject inline on
tablet/desktop and as a `fixed` bottom bar below `sm` — implemented
directly with Tailwind responsive classes (`hidden sm:flex` /
`sm:hidden`), no separate mobile component.

## Known simplifications

- No PDF email attachment (see above) — the link is the primary
  artifact; download is one tap away on the page it opens.
- WhatsApp send requires real Business API credentials to actually
  deliver; without them it's logged as an activity but not sent — the
  send call itself never fails the request over this.
- OTP gates *approval*, not general viewing, as a deliberate trust-model
  choice (see "Functions" above) — not every studio needs view-gating
  for a routine quote.

## New permissions

`quotation:manage` / `quotation:view` were added to `@bcp/permissions`,
granted to `owner`, `admin`, `manager`, and `sales` — same role-sync
caveat noted in Prompts 13–15 (existing provisioned studios need a sync
step to gain new permissions on existing roles).

## Testing

```bash
pnpm --filter @bcp/quotations test   # pipeline, pricing, and the pricing-visibility rule's dedicated suite
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build     # /quotations
pnpm --filter @bcp/client-portal build  # /quote/[token]
```
