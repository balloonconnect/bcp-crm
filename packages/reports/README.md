# @bcp/reports

Pure logic for reports and analytics: the 22-report-type registry
(grouped into categories for the report picker), a generic column-
based CSV builder every report shares, and schedule-date computation
(including correct month-end rollover for monthly schedules). No
database access — `apps/api`'s `reports.service.ts` runs the 22 actual
queries and `saved-reports.service.ts` handles saving, export, and
scheduling.

## What's here

```
src/
  report-types.ts              REPORT_TYPES — all 22 named in the
                              brief, each tagged with a category;
                              groupReportsByCategory()
  csv-export.ts                    buildReportCsv() — one generic
                              column-based CSV builder every report
                              shares, not 22 bespoke exporters
  schedule.ts                          computeNextSendAt() (daily/
                              weekly/monthly, with correct month-end
                              handling), isDue()
  validation.ts                            runReportSchema, saveReportSchema,
                              scheduleReportSchema
  index.ts                                    barrel export
```

See [docs/reports-and-analytics.md](../../docs/reports-and-analytics.md)
for the full design — why every report shares one `{ columns, rows }`
shape, and how responsive charts are a real, dependency-free feature
rather than an afterthought.

## Testing

```bash
pnpm --filter @bcp/reports test
pnpm --filter @bcp/reports typecheck
pnpm --filter @bcp/reports lint
```
