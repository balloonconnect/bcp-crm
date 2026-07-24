# @bcp/billing

Plan limits (all 16 dimensions), usage-warning thresholds (70/85/95/100%),
and license lifecycle logic (one-year validity, grace periods, renewal,
activation policy).

See [docs/subscription-licensing.md](./docs/subscription-licensing.md)
for the full design — why plan limits are one JSON field instead of 16
typed columns, why license renewal creates a new key rather than mutating
the old one, and the complete enforcement wiring map (API, workers, AI
jobs, user creation, domain creation).

## Structure

```
src/
  plan-limits.ts     the 16-dimension PlanLimits zod schema
  plans.ts             the 5-plan catalog (Starter/Professional/Business/Enterprise/Custom)
  limit-warnings.ts      evaluateUsageWarning(), crossedNewThreshold() — the 70/85/95/100% logic
  license-lifecycle.ts     one-year expiry, grace period, resolveEffectiveStatus(), canRenew()
  activation-policy.ts       validateActivationAttempt() — the full activation gate
```

Every module here is pure logic with no database dependency — the actual
Prisma queries and HTTP wiring live in
`apps/api/src/services/plan-limit-enforcement.ts`,
`apps/api/src/services/license-activation.service.ts`, and
`apps/worker/src/lib/plan-limit-guard.ts`.

## Quick start

```ts
import { PLAN_DEFINITIONS, evaluateUsageWarning, validateActivationAttempt } from "@bcp/billing";

const starter = PLAN_DEFINITIONS.starter;

const warning = evaluateUsageWarning(currentUserCount, plan.limits.maxUsers);
// { level: 85, percentUsed: 85, check: { allowed: true, ... } }

const decision = validateActivationAttempt({ license, currentActiveActivationCount, requestingStudioId });
// { allowed: true } | { allowed: false, reason: "max_activations_reached" | ... }
```
