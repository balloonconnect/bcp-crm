# Reports and Analytics

All 22 reports named in the brief, sharing one normalized output shape
— date/branch/user filters, saved reports (filters snapshotted, not
just a bookmark), CSV and PDF export, scheduled recurring reports, and
responsive charts with a data-table fallback. Built across
`@bcp/reports` (report-type registry, CSV formatting, schedule-date
computation — all pure) and `apps/api`'s `reports.service.ts` (the 22
report queries) and `saved-reports.service.ts` (saving, export,
scheduling).

## One shape, 22 reports

Every report — from `leads` through `whatsapp_usage` — returns the
same `{ columns, rows }` structure. This is deliberate: it's what lets
a single CSV builder (`buildReportCsv()`), a single PDF renderer, and a
single frontend table/chart component handle all 22 without any of
them needing to know which specific report produced the data they're
formatting.

## Saved reports snapshot their filters

A `SavedReport`'s `filters` field is captured at save time, not a live
reference to whatever the report-builder UI's current defaults are —
reopening a saved report reproduces the exact same query every time,
independent of anything that's changed in the UI since.

## Scheduled reports compute their own next-send date

`ScheduledReport.nextSendAt` is computed and stored
(`computeNextSendAt()`), not derived on the fly, so a scheduler job can
cheaply find everything due right now with one indexed comparison
rather than recomputing every active schedule's cadence on every poll.
Monthly scheduling handles month-end correctly — a report scheduled on
the 31st rolls to the last valid day of a shorter month (the 28th or
30th) rather than overflowing into the following month.

## Responsive charts, with a real data-table alternative

Rather than add a new charting dependency mid-build, "Responsive
charts" are plain CSS/SVG-free percentage-width bars that reflow at
any screen size — used automatically whenever a report's shape is a
clean label+number pairing (source breakdowns, event-type counts, team
performance). Every other report shape falls back to the plain data
table, which is the actual "data-table alternative" the brief names,
not an afterthought.

## A repeated mistake, caught the second time by actually checking

While wiring the routes, I initially reached for a `dashboard:view`
permission key — the same nonexistent key I'd already used once before
in an earlier prompt. Checking the actual permissions catalog this
time (rather than assuming) turned up something better than a
workaround: `report:view` already existed as its own dedicated
permission in a "Reports" category, anticipated by the platform the
same way `maxAutomationRunsPerMonth` and `maxAiFaceSearchesPerMonth`
turned out to already exist when earlier prompts needed them.

## Testing

```bash
pnpm --filter @bcp/reports test   # report-type registry, CSV export, schedule-date computation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /reports filters, run, save, export, schedule
```
