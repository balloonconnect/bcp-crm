# Lead management

Expands the minimal Prompt 11 `Lead` model into the full field set, a
9-stage pipeline, 4 views, and the full set of lead-management features
— built across `@bcp/leads` (pure pipeline/validation/duplicate-
detection/scoring logic), `apps/api`'s lead services and routes, and
`apps/studio-web`'s `/leads` page.

## Pipeline migration

The old 5-stage `LeadStatus` (`new/contacted/quoted/converted/lost`)
became the 9-stage pipeline in the brief
(`new/contacted/qualified/meeting_scheduled/quotation_sent/negotiation/
booking_pending/won/lost`). Postgres can't narrow an enum's value set
directly, so migration `20260710000900_lead_management` recreates the
type under a temporary name, migrates the `status` column with an
explicit mapping (`quoted → quotation_sent`, `converted → won`), and
drops the old type — a real, data-safe migration pattern, not just a
schema.prisma edit. `packages/leads/src/pipeline.ts`'s `PIPELINE_STAGES`
is the single source of truth for stage order/labels from here on;
`getStandingCount()`'s `maxLeads` dimension and the dashboard's lead
widgets were updated to stop referencing the removed `quoted`/`converted`
values.

## Fields

Every field in the brief is on the `Lead` model — see the schema's
inline comments for the couple of small design choices: `Lead.notes` is
a quick free-text field, distinct from the timestamped `LeadNote` thread
(the "Notes" *feature*); `budget` is the client's stated number,
`expectedValue` is the studio's own estimate — kept separate since they
often differ and both are useful signals.

## Views

- **Table** and **mobile card list** are the same view:
  `@bcp/ui`'s `ResponsiveDataView` (built in the design-system phase)
  already renders a `<table>` at `md`+ and a stacked card list below
  that from one `columns` definition — no separate mobile component was
  needed.
- **Kanban**: 9 columns (one per pipeline stage), native HTML5
  drag-and-drop between columns — same no-extra-dependency approach as
  the dashboard's widget reordering.
- **Calendar**: a month grid by `eventDate` (the date a shoot is wanted
  for — the thing worth seeing at a glance for spotting date clashes),
  not by `createdAt` or `followUpAt`.

## Features

- **Duplicate detection**: `POST /leads/check-duplicates` runs a
  narrow, studio-scoped DB query for phone/email overlap, then hands
  candidates to `@bcp/leads`'s pure `findDuplicates()` for the actual
  normalized comparison (phone digits, lowercased email, Instagram
  handle stripped of `@`/URL prefix). Surfaced inline in the create
  form as a warning, not a hard block — legitimate reasons for
  duplicate contact info exist (a parent booking on a couple's behalf).
- **Assignment**: `assignedTo` on the lead; bulk assignment via
  `POST /leads/bulk/assign`.
- **Bulk actions**: bulk status change and bulk assign, both capped at
  200 leads per call and logged as a single `AuditLog` entry (not one
  per lead) so a bulk action doesn't flood the timeline.
- **Timeline**: merges three existing sources — `AuditLog` (status
  changes, assignment, conversion), `LeadNote`, and `LeadCommunication`
  — into one chronological feed, rather than a fourth table that would
  mean writing every event twice.
- **Notes**: the `LeadNote` thread (see Fields above).
- **Attachments**: `LeadAttachment` + `@bcp/storage`, same S3/MinIO
  pattern branding assets use — signed GET URLs generated on read, not
  stored as public URLs.
- **Communication history**: `LeadCommunication` — manually logged
  (channel, direction, summary) in this phase; auto-logging from real
  email/WhatsApp/call integrations is future scope, same caveat as the
  onboarding wizard's payment-gateway step.
- **Lost reasons**: `lostReason` on the lead, set when moving to `lost`;
  `LOST_REASONS` in `@bcp/leads` is a fixed list rather than free text
  so lost-reason reporting stays aggregable.
- **Follow-up reminders**: `followUpAt` feeds the existing dashboard
  "Follow-ups due" widget (Prompt 11) — the SEND itself reuses the
  dashboard's existing `POST /reminders` action, not a new send path.
- **Conversion to client**: `POST /leads/:id/convert` creates a real
  `Client` row and marks the lead `won` with `convertedClientId` +
  `convertedAt`, in one transaction.
- **AI lead score / budget prediction / package suggestion**: honestly
  rule-based heuristics (`packages/leads/src/scoring.ts`), the same
  choice and the same reasoning as the dashboard's "AI recommendations"
  (`docs/studio-dashboard.md`) — a real model needs real outcome history
  to beat a well-chosen heuristic, which this product doesn't have yet.
  Each heuristic is a pure function with its weights/logic documented
  inline, and the lead detail view's "AI insights" tab labels them
  plainly as rule-based rather than overselling them.

## Testing

```bash
pnpm --filter @bcp/leads test        # pipeline/validation/duplicate-detection/scoring logic
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # verifies /leads compiles and prerenders
```
