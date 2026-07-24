# Demo Data and Product Tour

A fully populated demo studio (Balloon Connect Photography) covering
every category named in the brief, and a 10-step interactive product
tour across Studio Console's own real pages.

## Demo data

`packages/database/prisma/seed.ts` already had a genuinely solid
foundation before this pass — the demo studio itself, two branches,
all 11 system roles, a studio owner and two team members, a real
trial→active subscription, a license key, and a fully verified custom
domain. What was missing was the *business* data that makes a demo
studio feel real rather than empty: this pass added `seedDemoBusinessData()`,
covering every remaining category named in the brief —

- **Leads** — 10, spanning the full funnel (new → contacted →
  qualified → negotiation → quotation sent → won → lost), across
  every lead source the platform tracks.
- **Clients** — converted from the 4 "won" leads.
- **Packages** — 5, across wedding, engagement, birthday, and
  corporate event types.
- **Quotations, bookings, events** — a real pipeline: 2 completed
  events (with galleries and deliverables), 2 upcoming confirmed
  events.
- **Invoices and payments** — one fully paid, one fully paid, one
  partially paid, one unpaid — a realistic spread, not every invoice
  in the same state.
- **Expenses** — tied to specific events (travel, equipment) and
  studio-wide (marketing, rent), so the Profit report has real numbers
  to compute against.
- **Equipment** — 5 items across camera, lighting, and lens
  categories.
- **Galleries and photos** — 2 galleries (one per completed event), 8
  photo rows each.
- **Album selections** — one album mid-selection, with a mix of
  selected, pending, and favorited photos — demonstrating the actual
  selection-state model, not just an empty album shell.
- **AI results** — real `PhotoAnalysis` rows on a few wedding gallery
  photos (quality scores, blur/exposure assessment, moment tags,
  explanation text) and a real `MarketingContentRequest` (an approved
  Instagram caption) — both using the platform's actual AI-result
  schema, not placeholder text.
- **Automation example** — a real "Payment overdue reminder" rule
  with a WhatsApp-send step, inactive by default the way every new
  automation rule is (Prompt 38's own "inert until enabled"
  convention), but enabled here so the demo shows a working example.
- **Reports** — not separately seeded; report data is *computed* from
  everything above, so a studio with real leads, invoices, and events
  already has meaningful numbers the moment any of the 22 reports
  runs.

## Demo data must not run in production unless explicitly enabled

`shouldSeedDemoBusinessData()` is the one gate every business-data
seed function is checked against: in any environment where
`NODE_ENV === "production"`, the demo business data is skipped
entirely unless `SEED_DEMO_DATA=true` is explicitly set. The platform
catalog and subscription plans still always seed regardless of
environment — those are real, always-needed reference data, not demo
content, and the distinction between the two is what this gate
actually protects.

## The product tour

A lightweight, dependency-free tour built directly into `apps/studio-web`
(`src/components/tour/`) — no new UI library added, since the actual
requirement (spotlight a real element, show a tooltip, step through a
fixed sequence) doesn't need one. `TOUR_STEPS` covers all 10 surfaces
named in the brief, each pointing at a real `data-tour="..."`
attribute added directly to that page's own root element — never a
guessed CSS class that could silently break if unrelated styling
changes. Advancing to a step whose target lives on a different route
triggers a real navigation first, so the tour genuinely walks someone
through the app rather than only pointing at whatever's already on
screen. Completion is remembered per browser so it never repeats
unprompted, but "Restart Tour" is always available from the toolbar.

### Two honest compromises made under real constraints

- **AI Face Search** and **Settings** don't have a single, always-visible
  page to point at (face search is configured inside a per-gallery
  detail dialog, not visible on the gallery list itself; there's no
  single dedicated settings route — team, branding, and integrations
  are genuinely separate pages). Both steps point at the nearest real,
  always-reachable page (`/galleries` and `/team` respectively) with
  accurate, honest copy describing where the actual feature lives,
  rather than a selector for an element that might not be present when
  the step becomes active.

## Testing

```bash
pnpm --filter @bcp/database seed          # requires SEED_DEMO_DATA=true outside development to populate business data
pnpm --filter @bcp/database typecheck
pnpm --filter @bcp/studio-web build       # the tour system + all 10 data-tour targets
```
