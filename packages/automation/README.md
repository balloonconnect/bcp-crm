# @bcp/automation

Pure logic for the Automation Builder: the 16-trigger and 11-action
registries, step-graph traversal (including cycle detection for a
studio-edited visual graph), condition-branch evaluation, retry
policy, and per-rule rate-limit checking. No database access —
`apps/api`'s `automation-rules.service.ts` (studio CRUD) and
`automation-execution.service.ts` (the actual engine — trigger
dispatch, graph walking, executing all 11 action types, test mode) do
the real work.

## What's here

```
src/
  triggers.ts             AUTOMATION_TRIGGERS — all 16 named in the
                         brief, each tagged with its source entity type
  actions.ts                  AUTOMATION_ACTIONS — all 11 named in
                         the brief; isBranchAction() identifies
                         condition_branch as the one branching type
  graph-traversal.ts              resolveNextStep(), findEntryStep(),
                         detectCycle() — a studio's visual graph can
                         accidentally contain a loop; this is what
                         refuses to enable one
  condition-evaluation.ts             evaluateCondition() — a simple
                         field/operator/value shape a studio owner can
                         fill in, not a scripting language
  retry.ts                                hasRetriesRemaining() (cap
                         3, matching WhatsApp/email's own retry
                         ceiling), computeRetryDelayMinutes() (1, 2, 4,
                         capped at 30)
  rate-limiting.ts                            isRateLimited() — per-rule,
                         checked against the last hour's own execution
                         count
  validation.ts                                  createRuleSchema,
                         createStepSchema, testRunSchema, etc.
  index.ts                                          barrel export
```

See [docs/automation-builder.md](../../docs/automation-builder.md) for
the full design, including two honest scope boundaries: `wait` steps
don't actually pause execution (no job scheduler in this environment),
and triggers aren't yet wired to fire automatically from the 16 real
source events across the rest of the codebase — the execution engine
itself is complete and reachable via test-run/manual-run endpoints.

## Testing

```bash
pnpm --filter @bcp/automation test
pnpm --filter @bcp/automation typecheck
pnpm --filter @bcp/automation lint
```
