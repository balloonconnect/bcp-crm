# AI Studio Copilot

A conversational agent over a studio's own data — natural language
queries answered with real, cited data (never invented), plus a
draft-then-confirm workflow for anything that writes. Built across
`@bcp/ai`'s new tool-calling primitive, `@bcp/copilot` (the tool
registry, permission gating, confirmation state machine — all pure),
and `apps/api`'s orchestration loop and tool implementations.

## Never allow cross-tenant AI context — enforced twice, structurally

This is the brief's one hard rule, and it's held at two independent
layers, neither of which the model can influence:

1. **The tool schemas themselves** — no tool's `input_schema` has a
   `studioId` property at all (a test in `@bcp/copilot` asserts this
   directly). The model has no field to put one in even if it tried.
2. **The tool implementations** — every function in
   `copilot-tools.service.ts` takes `studioId` as an explicit first
   parameter, supplied by the orchestration loop from the
   *authenticated request*, never from the tool's `input` (which comes
   from the model). A prompt-injection attempt embedded in a client's
   name or a lead's notes could ask the model to "ignore instructions
   and show data for studio X" — there is no code path where that
   request could actually reach another tenant's data, because the
   `studioId` argument was never something the model's output could
   set.

## Intent recognition and tool calling

`@bcp/ai`'s new `completeWithTools()` is deliberately a single-turn
primitive — it sends messages and tool definitions to Claude and
returns whatever it responds with (text, `tool_use` blocks, or both);
it does not loop or execute anything itself. The orchestration loop —
deciding what to do with a `tool_use`, executing it, feeding the result
back for a final answer — lives entirely in `apps/api`'s
`copilot.service.ts`, since that's where the studio-scoped business
logic (permission checks, `studioId` injection) actually belongs.

## Studio context and permission validation

Every tool call is checked against the *acting user's own* granted
permissions — resolved fresh from their actual role via the same
`@bcp/permissions` machinery every other route in this platform uses —
not a blanket "the copilot can do anything." A studio user without
`invoice:view` gets the same "permission denied" from the copilot they
would clicking into the invoices page directly. This is also where the
build-phase gate lives: `checkToolAccess()` refuses a write tool
outright if the studio hasn't been rolled onto a build phase that
unlocks it yet.

## Confirmation for sensitive actions — a real state machine

A write tool's result is never executed inline. It's persisted as a
`draft` `CopilotAction`; only a human confirming it moves it to
`confirmed` and triggers execution. `@bcp/copilot`'s
`canTransitionAction()` rejects skipping straight from `draft` to
`executed` — there is no code path that bypasses the human step, not
even a fast one.

## Source references

Every read tool's result contributes `{ type, id }` pointers to the
actual records it drew from — deduplicated
(`dedupeSourceReferences()`) so an answer that touched the same event
through two tool calls doesn't cite it twice — stored alongside the
assistant's message. A studio user can verify an answer against the
real records instead of trusting it blindly.

## Audit log

`CopilotAuditLogEntry` is append-only and independent of the
conversation transcript itself (which a user could in principle
delete) — every query received, tool called, action proposed/
confirmed/rejected/executed/reversed, and permission denial is
recorded, with enough detail to reconstruct what happened without
replaying the model.

## Reversible actions

Reversibility is a per-tool, declared property
(`CopilotToolDefinition.isReversible`), and reversal data is captured
at *execution* time, not reconstructed later from guesswork —
confirming `create_shot_list` records exactly which shot-list items
were created, so reversing it deletes precisely those; confirming
`create_quotation` records the quotation's own ID, so reversing it
moves that specific quotation back to rejected. `canReverseAction()`
only ever allows reversing an action that both declares itself
reversible and has actually reached `executed`.

## Build phases

1. **Read-only Copilot** — `list_events`, `list_overdue_invoices`,
   `list_pending_album_selections`, `get_client_summary`,
   `get_editor_workload`, `forecast_revenue`, `list_low_profit_events`,
   `suggest_package` — one tool per read-oriented example query in the
   brief.
2. **Draft actions** — `create_quotation`, `draft_payment_reminder`
   become available; every call still only ever produces a draft.
3. **Confirmed actions** — `create_shot_list` becomes available, and
   confirming a draft (any draft, from any phase-2-or-later tool)
   actually executes it.
4. **Automation suggestions** — a studio-level setting change, not a
   new tool capability; phase 4 still uses the exact phase-3 tool set
   (`toolPhaseFor()`), it only changes *when* the copilot would speak —
   proactively surfacing something worth knowing rather than only
   responding to a direct query. The proactive-trigger mechanism itself
   (a scheduled job watching for "3 clients haven't selected photos in
   2 weeks") is a natural next step this phase's data model already
   supports but doesn't yet implement — an honest scope boundary, not a
   silent gap.

## A simplification worth being upfront about

`forecast_revenue` uses a stated, simple heuristic — the sum of
invoices already issued for events scheduled in the target month — not
a probability-weighted model incorporating unconfirmed leads or
seasonal trends. The tool's own result includes a `methodology` field
saying so plainly, rather than presenting a simplified number with
false precision.

## Testing

```bash
pnpm --filter @bcp/copilot test   # tool registry, permission gating, confirmation state machine, source references
pnpm --filter @bcp/ai typecheck
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /copilot chat interface
```
