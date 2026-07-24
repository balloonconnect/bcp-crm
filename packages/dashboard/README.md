# @bcp/dashboard

Pure logic for the studio CRM dashboard: the 19-widget registry, layout/
customization primitives (visibility, reorder, validation), and the
8-item quick-action registry. Like `@bcp/onboarding`, no database access
and no framework code — `apps/api` (summary/layout endpoints) and
`apps/studio-web` (the widget grid, customization UI, quick-action
dialogs) both import from here so widget keys, titles, and default order
live in exactly one place.

## What's here

```
src/
  widgets.ts        WIDGET_REGISTRY (19 widgets: key, title, description,
                     category, defaultOrder)
  quick-actions.ts   QUICK_ACTIONS (8 actions: key, label, description)
  layout.ts          DashboardLayout type, defaultLayout(), reconcileLayout(),
                     toggleWidgetVisibility(), moveWidget()/moveWidgetUp()/
                     moveWidgetDown(), dashboardLayoutSchema (zod)
  index.ts           barrel export
```

See [docs/studio-dashboard.md](../../docs/studio-dashboard.md) at the
repo root for the full design rationale — what's deliberately minimal
about the underlying CRM models, how customization persists, and why
"AI recommendations" is honestly rule-based in this phase.

## Usage

```ts
import { WIDGET_REGISTRY, defaultLayout, moveWidgetDown } from "@bcp/dashboard";

const layout = defaultLayout(); // every widget, visible, in registry order
const reordered = moveWidgetDown(layout, "storage_usage");
```

## Testing

```bash
pnpm --filter @bcp/dashboard test
pnpm --filter @bcp/dashboard typecheck
pnpm --filter @bcp/dashboard lint
```
