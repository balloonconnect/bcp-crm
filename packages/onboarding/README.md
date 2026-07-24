# @bcp/onboarding

Pure logic for the studio onboarding wizard: the 20-step registry,
progress/completion math, per-step validation schemas, the setup
checklist, and sample-data definitions. No database access and no
framework code — `apps/api` and `apps/studio-web` both import from here
so the step order, titles, and "is this step required" rules live in
exactly one place instead of being duplicated across backend routes and
frontend forms.

## What's here

```
src/
  steps.ts        ONBOARDING_STEPS registry (20 steps: key, order,
                   title, description, category, required, writesLiveRecord)
  progress.ts      computeProgress(), canSkipStep(), assertCanSkipStep()
  validation.ts    per-step zod schemas, STEP_SCHEMAS map
  checklist.ts     buildSetupChecklist(), getOutstandingChecklistItems()
  sample-data.ts   SAMPLE_SERVICES / SAMPLE_PACKAGES / SAMPLE_CUSTOMERS
  index.ts         barrel export
```

See [docs/onboarding.md](docs/onboarding.md) for the full design
rationale — staged vs. live steps, the provisioning transaction, and how
resume-later works.

## Usage

```ts
import { ONBOARDING_STEPS, computeProgress, STEP_SCHEMAS } from "@bcp/onboarding";

const progress = computeProgress(session.completedSteps, session.skippedSteps);
// { percentComplete, nextStep, isComplete, outstandingRequiredSteps, ... }

const parsed = STEP_SCHEMAS.gst_details.parse(requestBody);
```

## Testing

```bash
pnpm --filter @bcp/onboarding test
pnpm --filter @bcp/onboarding typecheck
pnpm --filter @bcp/onboarding lint
```
