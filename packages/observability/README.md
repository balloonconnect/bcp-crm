# @bcp/observability

Pure logic for monitoring and observability: the 8-monitored-service
registry, health-status aggregation (worst service wins), alert-
condition evaluation (N consecutive checks, not one blip), uptime
percentage calculation, and — the part with the most safety weight —
the "never log" redaction path list. No pino, Fastify, or database
access — `@bcp/logger` wires the redaction list into its root logger,
and `apps/api`'s `health-checks.service.ts`/`alerts.service.ts`/
`incidents.service.ts` do the actual checking and persistence.

## What's here

```
src/
  services-registry.ts        MONITORED_SERVICES — all 8 named in the
                             brief, each tagged with whether it's
                             live-pingable or configuration-only
  health-aggregation.ts           aggregateOverallHealth() (worst
                             service wins), evaluateAlertCondition()
                             (N consecutive checks required)
  uptime.ts                           computeUptimePercent() —
                             degraded counts as down, not up
  redaction.ts                            NEVER_LOG_PATHS (the five
                             brief categories mapped to real field-name
                             patterns), isSensitiveFieldName()
  request-context.ts                          generateRequestId(),
                             RequestLogContext
  validation.ts                                  zod schemas for
                             alert-rule and incident requests
  index.ts                                          barrel export
```

See [docs/monitoring-and-observability.md](../../docs/monitoring-and-observability.md)
for the full design, including two real bugs this pass caught before
they shipped.

## Testing

```bash
pnpm --filter @bcp/observability test
pnpm --filter @bcp/observability typecheck
pnpm --filter @bcp/observability lint
```
