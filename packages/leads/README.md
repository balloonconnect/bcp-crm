# @bcp/leads

Pure logic for lead management: the 9-stage pipeline registry, zod
validation for the full lead field set, duplicate-detection matching,
and the rule-based "AI" scoring/budget-prediction/package-suggestion
heuristics. Like `@bcp/onboarding` and `@bcp/dashboard`, no database
access — `apps/api` and `apps/studio-web` both import from here.

## What's here

```
src/
  pipeline.ts             PIPELINE_STAGES (9 stages), LEAD_PRIORITIES,
                           LEAD_SOURCES, LOST_REASONS
  validation.ts            leadInputSchema, leadUpdateSchema,
                           leadStatusChangeSchema, bulk-action schemas
  duplicate-detection.ts   findDuplicates() — normalized phone/email/
                           Instagram matching
  scoring.ts               computeLeadScore(), predictBudget(),
                           suggestPackage() — rule-based, documented inline
  index.ts                 barrel export
```

See [docs/lead-management.md](../../docs/lead-management.md) for the
full design rationale, including the Postgres enum migration this
package's pipeline replaced.

## Testing

```bash
pnpm --filter @bcp/leads test
pnpm --filter @bcp/leads typecheck
pnpm --filter @bcp/leads lint
```
