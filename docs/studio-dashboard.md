# Studio CRM dashboard

The studio-facing dashboard at `apps/studio-web`'s `/` route — 19
widgets and 8 quick actions summarizing a studio's day-to-day operations
in one screen, backed by a new minimal CRM data layer (`@bcp/database`'s
Lead/Event/Quotation/Invoice/ClientPayment/Gallery/Album/Expense models)
and a shared widget/layout registry (`@bcp/dashboard`).

## Scope: minimal v1 models, not a full CRM

This is explicitly a **dashboard phase**, not a full CRM build-out. Every
new model backing a widget has just enough fields for the dashboard to
show real, correct numbers — status, amount, date — not a complete
workflow engine. Concretely, still deferred to later phases:

- **Quotations/invoices** have no line items (just a subtotal + GST +
  total) — a real quotation builder with per-service pricing is future
  scope, matching the marketing site's "Quotations and Invoices" feature
  page describing the vision, not a claim this phase implements it in full.
- **Galleries/albums** are status trackers (`pending_upload → uploaded →
  delivered`, `pending_selection → … → completed`), not the actual
  upload/watermarking/face-search/print-ordering pipelines.
- **Team availability** is derived, not scheduled — "busy" means
  assigned to *any* event today via `EventAssignment`, not a real shift
  or working-hours model.
- **"AI recommendations"** is honestly rule-based (see below), not a
  trained model.

## Data model additions (migration `20260710000800_studio_crm_dashboard`)

10 new models: `Lead`, `Event`, `EventAssignment`, `Quotation`,
`Invoice`, `ClientPayment`, `Gallery`, `Album`, `Expense`,
`DashboardPreference` — see the schema's inline doc comments for each.

One isolation nuance: `EventAssignment` has no `studioId` column of its
own (just `eventId` + `studioUserId`), so it's intentionally **not** in
`TENANT_SCOPED_MODELS` — the tenant-scoping middleware requires a
`studioId` field to merge into `where`/`data`, and this table doesn't
have one. Isolation is enforced transitively: every write goes through
`eventId`, and `Event` itself is tenant-scoped, so an assignment can
only ever attach to an event that already belongs to the caller's studio.

`getStandingCount()` in `plan-limit-enforcement.ts` also gained real
cases for `maxClients`, `maxLeads`, `maxEvents`, and `maxGalleries` —
these plan-limit dimensions existed since the billing phase but silently
fell through to a `default: 0` (meaning they were declared but never
actually enforced) because the models they count didn't exist yet. This
phase closes that gap as a side effect of adding the models it counts.

## Widget registry (`@bcp/dashboard`)

`WIDGET_REGISTRY` in `packages/dashboard/src/widgets.ts` is the single
source of truth for all 19 widgets — key, title, description, category,
and a `defaultOrder` that both seeds a new team member's layout and
serves as mobile's default priority order. The backend's
`GET /dashboard/summary` and the frontend's widget grid both key off the
same 19 `WidgetKey` values, so a new widget only needs to be added once
here.

## Layout & customization

`DashboardPreference` stores one row per `StudioUser` — not per studio —
since two people on the same studio may want different widgets front
and center. The layout is `{ key, visible }[]`, order given by array
position, validated by `dashboardLayoutSchema` (`packages/dashboard/src/layout.ts`)
on every write.

- **Configurable widgets**: any widget can be hidden; hidden widgets
  surface in a "Hidden widgets" panel to re-add.
- **Desktop drag-and-drop**: native HTML5 drag events on each widget
  card — no drag-and-drop library dependency, since reordering a flat
  grid doesn't need one.
- **Mobile reordering**: up/down buttons per widget in "Customize" mode,
  since native HTML5 drag doesn't work reliably on touch. Both paths
  call the same `moveWidget()`/`moveWidgetUp()`/`moveWidgetDown()`
  primitives, so desktop and mobile reordering always produce identical
  results.
- Layout edits are debounced (400ms) before `PUT /dashboard/layout`, so
  dragging through several positions fires one request, not one per
  intermediate position.
- `reconcileLayout()` repairs a saved layout against the current
  registry on every read — drops widgets that no longer exist, appends
  any the registry has gained since a person last customized (visible,
  appended at the end so a new widget doesn't jump ahead of an existing
  custom order).

## Responsive behavior

Every widget is a uniform card (no variable spanning) in a CSS grid:
1 column by default, 2 at `sm`, 3 at `lg`, 4 at `xl` — matching "desktop
multi-column / tablet two-column / mobile one-column" without masonry
layout complexity. Order is applied via the CSS `order` property per
card rather than physically reordering DOM nodes, which stays cheap
during a drag gesture.

## "AI recommendations," honestly

`buildRecommendations()` in `apps/api/src/services/dashboard.service.ts`
is rule-based: it looks at the same aggregates every other widget
already computed (overdue payment count, follow-ups due, pending
quotations, editing backlog) and turns them into a prioritized nudge
list. This is a deliberate choice, not a corner cut silently — a real
recommendation engine using `@bcp/ai`'s Claude client to generate
context-aware, personalized suggestions (e.g. "this client usually books
a follow-up shoot within 3 months — worth a check-in") is a natural
next step once there's enough studio history to make that useful, but
would be a materially different (and untestable without real usage
data) feature to build now.

## Quick actions

The 8 quick actions (`QUICK_ACTIONS` in `packages/dashboard/src/quick-actions.ts`)
open one shared dialog (`components/dashboard/quick-action-dialog.tsx`)
with per-action field sets, calling real endpoints:

| Action | Endpoint |
|---|---|
| Add lead | `POST /leads` |
| Add client | `POST /customers` |
| Create quotation | `POST /quotations` |
| Record payment | `POST /invoices/:id/payments` |
| Create event | `POST /events` |
| Upload gallery | `POST /galleries` |
| Send reminder | `POST /reminders` |
| Create invoice | `POST /invoices` |

"Send reminder" sends a real one-off email via the shared `@bcp/email`
client (same as onboarding's team invitations) to a lead, client, or an
invoice's client. It's manual/on-demand only — automatic scheduled
reminders (e.g. "3 days before an unpaid invoice's due date") need a
studio-facing job scheduler that doesn't exist yet (only platform-level
jobs do, from the platform-admin phase).

## Testing

```bash
pnpm --filter @bcp/dashboard test         # widget/layout/quick-action registry logic
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build       # verifies the dashboard page compiles and prerenders
```
