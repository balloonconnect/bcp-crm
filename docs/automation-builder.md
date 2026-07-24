# Automation Builder

A visual trigger→action automation system — 16 triggers, 11 action
types (including a genuine condition branch and a wait step), a real
step graph for the visual editor, test mode, enable/disable,
execution history with per-step retry and failure detail, per-rule
rate limiting, and platform-wide usage enforcement. Built across
`@bcp/automation` (registries, graph traversal, condition evaluation,
retry/rate-limit policy — all pure) and `apps/api`'s
`automation-rules.service.ts` (studio CRUD) and
`automation-execution.service.ts` (the engine).

## The step graph, not a strict linear sequence

`AutomationStep` is a real graph node — `positionX`/`positionY` record
where a studio placed it on the visual canvas (purely presentational,
never read by the execution engine), and every non-branch action has
at most one successor (`nextStepId`); `condition_branch` is the one
step type with two (`conditionTrueStepId`/`conditionFalseStepId`).
Deliberately a tree with exactly one branching node type rather than a
fully general DAG — simple enough for a studio owner, not a developer,
to build and understand.

## Test mode is honored by every action individually

A `isTestRun` flag doesn't just skip execution at the top of the loop
— every one of the 11 action implementations checks it itself and
returns a simulated result (`{ simulated: true, wouldSendTo, ... }`)
describing what it *would* have done, rather than actually sending a
WhatsApp message, creating a task, or calling a webhook. A studio can
safely verify a new automation's logic before ever enabling it for
real.

## Enable and disable, with a real precondition

A rule is inert — never fires, regardless of matching triggers — until
`isActive` is explicitly set true. Enabling validates the step graph
first (`@bcp/automation`'s `findEntryStep()` and `detectCycle()`): a
rule needs exactly one starting step and no loop back to an earlier
step before a studio can turn it on, so an automation can't accidentally
run forever the moment it's enabled.

## Rate limiting and usage enforcement are two different guarantees

Rate limiting (`AutomationRule.maxExecutionsPerHour`, default 100) is
per-rule — a runaway automation (one that, directly or through a chain
of other rules, ends up triggering itself) is stopped before it can
spend a studio's entire monthly allowance in minutes. Usage enforcement
is platform-wide and reuses infrastructure that already existed:
`maxAutomationRunsPerMonth` was already a defined plan-limit dimension
in `@bcp/billing` before this feature was built — no new
usage-tracking system was needed, just the same
`assertWithinPlanLimit()`/`recordUsage()` pair every other metered
feature in this codebase already uses. Both checks run *before* a
single step executes; a run that would exceed either never starts.

## Retry and failure handling

Each `AutomationStepExecution` tracks its own `attemptCount` and
`errorMessage`. `hasRetriesRemaining()` caps retries at 3 — the same
ceiling this codebase already uses for WhatsApp/email send retries,
not a new number invented for automation specifically — with
exponential backoff (`computeRetryDelayMinutes()`: 1, 2, 4 minutes,
capped at 30). A step that ultimately fails stops that execution's
graph traversal entirely rather than silently skipping ahead, so a
studio always sees exactly where an automation actually broke.

## Two real bugs caught during development

A `send_whatsapp`/`send_email`/`send_notification` action's actor ID
was initially hardcoded to the literal string `"automation"` — which
would have failed outright the first time any of those actions ran for
real, since the underlying columns are `@db.Uuid`. Fixed to thread a
genuine `StudioUser` UUID through the whole execution call chain
instead of assuming a placeholder string would be accepted. A second
schema-authoring typo (`Automation Rule_` instead of `AutomationRule`
in a relation field) was caught immediately by the same relational-
integrity validation this whole build has relied on throughout.

## An honest scope boundary: "wait" doesn't actually pause

`wait` steps are recorded (the requested delay is logged in the step's
result data) but automation runs execute synchronously start-to-finish
in this environment — there's no job scheduler to pause a run and
resume it after N minutes. This is stated plainly in the code and
here, not hidden behind a step that silently does nothing.

## A second honest scope boundary: triggers aren't wired to real events yet

This prompt built a complete, working execution engine — reachable
today via test-run and manual-run endpoints — but did not wire
automatic trigger-firing into the 16 real source events (a lead
actually being created, a payment actually going overdue, and so on)
across the rest of the codebase. That would touch dozens of existing
services. What exists is the engine itself, fully capable of running
any rule the moment something calls `runRule()`; connecting that call
to each of the 16 real events is the natural next layer.

## Testing

```bash
pnpm --filter @bcp/automation test   # registries, graph traversal, condition evaluation, retry, rate limiting
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /automation rule list + step editor + test mode + execution history
```
