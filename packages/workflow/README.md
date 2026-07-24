# @bcp/workflow

Pure logic for the task & workflow engine: the 17-stage default
workflow registry, dependency-cycle detection, SLA/escalation
resolution, recurrence-date math, and validation. Like `@bcp/events` and
`@bcp/bookings`, no database access — `apps/api` gathers candidate data
from the database and hands it to these functions; `apps/studio-web`
imports the same registries directly.

## What's here

```
src/
  default-workflow.ts   DEFAULT_WORKFLOW_STAGES (17 stages) — the
                        seed-data starting point, not a fixture
  dependencies.ts         isTaskUnblocked(), detectDependencyCycle()
                        — DFS cycle detection over task templates
  sla.ts                   resolveSlaDeadline(), resolveSlaStatus(),
                        shouldEscalate()
  recurrence.ts            computeNextOccurrence() — calendar
                        arithmetic, not fixed-millisecond offsets
  validation.ts            workflowTemplateInputSchema,
                        taskTemplateInputSchema, taskInputSchema, etc.
  index.ts                 barrel export
```

See [docs/task-workflow-engine.md](../../docs/task-workflow-engine.md)
for the full design — the template/instance split, how a workflow gets
applied to a booking or event, and what's a deliberate v1
simplification (escalation resolves on read rather than a scheduled
job, same pattern `@bcp/bookings` uses for payment milestones).

## Testing

```bash
pnpm --filter @bcp/workflow test
pnpm --filter @bcp/workflow typecheck
pnpm --filter @bcp/workflow lint
```
