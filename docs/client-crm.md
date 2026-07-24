# Client CRM

Expands the Prompt 9 minimal `Client` (name/email/phone/source/notes)
into a full profile — built across `@bcp/clients` (timeline registry,
validation, financial aggregation, relationship-score/AI heuristics),
`apps/api`'s client services and routes, and `apps/studio-web`'s
`/clients` page.

## Profile fields

Every field in the brief is on `Client` directly (see the schema's
inline comment for why: it deliberately mirrors several of `Lead`'s
fields — bride/groom name, Instagram profiles — since a client is very
often a converted lead, and the two records should read as the same
person, not a re-entry). Billing and shipping addresses are separate
field groups with a `shippingSameAsBilling` flag rather than always
duplicating billing into shipping. "Important dates" is three named
fields (anniversary, bride's birthday, groom's birthday) plus a flexible
`otherImportantDates` JSON array for anything else a studio wants to
track — three fixed fields cover the common case without forcing every
studio into a fully freeform date list.

## Timeline

15 entry types, aggregated the same way the lead timeline is (Prompt 12):
compose from tables that already exist for their own reason, don't
duplicate into a new one. Two things worth noting:

- **Call / message / meeting** are one source — `ClientCommunication`
  split by its `channel` field — not three separate tables.
- **Booking vs. event** are the *same* `Event` row shown at two
  different moments: `createdAt` (when it was booked) and `scheduledAt`
  (when the shoot happens), not two separate records.

New tables backing timeline entries with no existing source:
`ClientFamilyContact`, `ClientCommunication`, `ClientContract`,
`PrintOrder`, `Delivery`, `ClientFeedback` — six models, each kept
deliberately minimal (a status tracker, not a full workflow — see each
model's inline schema comment for what's specifically out of scope,
e.g. `ClientContract` is status-tracked, not a full e-signature flow).

## Financials, relationship score, AI summary, next action

- **Lifetime value** = sum of `amountPaid` across every invoice — value
  actually realized, not value invoiced.
- **Outstanding amount** = total invoiced minus paid, across everything
  not cancelled.
- **Relationship score** and **AI summary** / **recommended next
  action** are honestly rule-based heuristics
  (`packages/clients/src/scoring.ts`, `ai.ts`) — the same choice, for
  the same reason, as the dashboard's "AI recommendations"
  (`docs/studio-dashboard.md`) and lead scoring
  (`packages/leads/src/scoring.ts`): there isn't yet real outcome
  history to make a trained model better than a documented heuristic.
  The summary is template-generated from real numbers (lifetime value,
  outstanding balance, event counts, last-contact recency), not a
  language-model call — exact and free to compute on every page load.

## Client portal access

`Client.portalAccessEnabled` + `portalInviteToken` (a unique opaque
token, same `generateOpaqueToken()` helper team invitations use) track
whether portal access is turned on and provide an invite token. This
phase only builds the toggle and token issuance
(`POST /clients/:id/portal-access/enable|disable`) — the actual client-
facing login/session flow into `apps/client-portal` using that token is
a natural next step once that app's client-facing (not just public-
form) surface is built out, not part of this phase.

## New permissions

`client:manage` / `client:view` were added to `@bcp/permissions`'s
catalog, granted to `owner`, `admin`, `manager`, and `sales` — same
role-sync caveat as the `enquiry_form:*` permissions added in Prompt 13
(existing provisioned studios don't automatically gain new permissions
on their existing roles without a sync step).

## Testing

```bash
pnpm --filter @bcp/clients test      # timeline registry, validation, financials, scoring, AI heuristics
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # verifies /clients compiles and prerenders
```
