# @bcp/copilot

Pure logic for the AI Studio Copilot: a fixed, named tool registry
(one tool per example query in the brief), permission gating checked
against the acting user's own granted role, a real draft → confirmed →
executed → reversed state machine, and source-reference
deduplication. No AI-SDK or database access — `apps/api`'s
`copilot.service.ts` runs the actual tool-calling loop against
`@bcp/ai`, and `copilot-tools.service.ts` implements each tool against
real Prisma queries.

## What's here

```
src/
  tool-registry.ts             COPILOT_TOOLS — 11 tools, each tagged
                              with kind (read/write), requiredPermission,
                              isReversible, and buildPhase; getToolDefinition(),
                              getToolsForPhase()
  phases.ts                        COPILOT_BUILD_PHASES (the 4 phases
                              named in the brief), toolPhaseFor()
  permission-gating.ts                 checkToolAccess() — the one
                              function every tool call passes through:
                              tool exists → phase unlocked → user's own
                              permission granted
  confirmation.ts                        canTransitionAction() (draft →
                              confirmed → executed → reversed, no
                              skipping), canReverseAction()
  source-references.ts                     dedupeSourceReferences()
  validation.ts                               sendMessageSchema,
                              confirmActionSchema, rejectActionSchema,
                              reverseActionSchema
  index.ts                                    barrel export
```

See [docs/ai-studio-copilot.md](../../docs/ai-studio-copilot.md) for
the full design — especially how "never allow cross-tenant AI context"
is enforced at two independent layers, neither of which the model can
influence.

## Testing

```bash
pnpm --filter @bcp/copilot test
pnpm --filter @bcp/copilot typecheck
pnpm --filter @bcp/copilot lint
```
