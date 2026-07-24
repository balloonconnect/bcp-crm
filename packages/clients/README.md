# @bcp/clients

Pure logic for the client CRM: the 15-type timeline registry, profile
validation, lifetime-value/outstanding-amount aggregation, and the
rule-based relationship-score/AI-summary/next-action heuristics. Like
`@bcp/leads` and `@bcp/dashboard`, no database access — `apps/api` and
`apps/studio-web` both import from here.

## What's here

```
src/
  timeline.ts      TIMELINE_EVENT_TYPES (15 types) — which source table
                    each maps to (some share one source split by a field)
  validation.ts     clientInputSchema, familyContactSchema,
                    clientCommunicationSchema, contractSchema, feedbackSchema
  financials.ts     computeLifetimeValue(), computeOutstandingAmount()
  scoring.ts        computeRelationshipScore() — pure heuristic, documented inline
  ai.ts             buildClientSummary(), recommendNextAction() — template-
                    generated from real numbers, not a language-model call
  index.ts          barrel export
```

See [docs/client-crm.md](../../docs/client-crm.md) for the full design
rationale — why several fields mirror `@bcp/leads`, how the timeline
avoids duplicating events into a new table, and what's honestly still a
heuristic rather than a trained model.

## Testing

```bash
pnpm --filter @bcp/clients test
pnpm --filter @bcp/clients typecheck
pnpm --filter @bcp/clients lint
```
