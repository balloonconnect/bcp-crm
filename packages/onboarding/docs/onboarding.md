# Studio onboarding

A 20-step guided wizard that takes a person from "just an email address"
to a fully set-up, trial-subscribed studio. Built across three pieces:
`@bcp/onboarding` (this package — the pure step registry, progress math,
validation, checklist, and sample data), `apps/api`'s
`onboarding.service.ts` (the orchestrator that turns step completions
into real database writes), and `apps/studio-web`'s `/onboarding` wizard
UI.

## The 20 steps

| # | Key | Required | Writes a live record |
|---|-----|----------|----------------------|
| 1 | `owner_account` | ✅ | ❌ (staged) |
| 2 | `studio_name` | ✅ | ❌ (staged — but *completing* it provisions everything) |
| 3 | `business_info` | – | ✅ (`StudioSetting`) |
| 4 | `branch` | ✅ | ✅ (`StudioBranch`) |
| 5 | `logo` | – | ✅ (`StudioBrand`) |
| 6 | `brand_colors` | – | ✅ (`StudioBrand`) |
| 7 | `gst_details` | – | ✅ (`StudioSetting`) |
| 8 | `bank_details` | – | ✅ (`StudioSetting`) |
| 9 | `upi_qr` | – | ✅ (`StudioSetting`) |
| 10 | `email_setup` | – | ✅ (`StudioBrand`) |
| 11 | `whatsapp_setup` | – | ✅ (`StudioBrand`) |
| 12 | `team_invitation` | – | ✅ (`Invitation`) |
| 13 | `services` | – | ✅ (`StudioSetting`, v1 — see below) |
| 14 | `packages` | – | ✅ (`StudioSetting`, v1 — see below) |
| 15 | `customer_import` | – | ✅ (`Client`) |
| 16 | `storage` | – | ❌ (read-only review of plan usage) |
| 17 | `payment_gateway` | – | ✅ (`StudioSetting` — records a preference, not a live OAuth connection) |
| 18 | `custom_domain` | – | ✅ (`StudioDomain`) |
| 19 | `subscription` | ✅ | ✅ (`StudioSetting` preference — the live `Subscription` row already exists from provisioning) |
| 20 | `final_review` | ✅ | ❌ (summary + completion) |

The registry (`ONBOARDING_STEPS` in `src/steps.ts`) is the single source
of truth for this table — order, titles, descriptions, and the
`required`/`writesLiveRecord` flags all live there, not duplicated in the
backend routes or the frontend step components.

## Staged vs. live steps

Steps 1 and 2 happen *before* a `Studio` row exists — there's nowhere
real to write an owner account or a studio name yet. Both are staged in
`OnboardingSession.stepData` (a JSON blob) until enough is known to
provision.

The moment `studio_name` is submitted, `provisionStudio()` runs a single
transaction that creates: the `Studio` (status `trial`, 14-day
`trialEndsAt`), an empty `StudioBrand`, the studio's role catalog seeded
from `@bcp/permissions`'s `STUDIO_ROLE_DEFINITIONS` (same as
`pnpm db:seed` does for the demo studio), a default "Main Branch"
`StudioBranch`, the owner `StudioUser` (using the credentials staged in
step 1), the owner's role assignment, and a `trialing` `Subscription` on
the Starter plan. It also immediately issues a real session (access +
refresh token), so every step from here on is a normal authenticated
request — not a special onboarding-only auth path.

Every step after that either calls the platform's existing feature APIs
directly (branch creation, branding theme updates, team invitations,
customer import, custom domains) or, for the handful of fields with no
dedicated model yet (business info, GST, bank details, UPI, services,
packages, payment gateway preference), goes through the generic
`StudioSetting` key/value store via `saveSettingsStep()`. This is a
deliberate v1 choice: a full Services/Packages catalog (with pricing
tiers, quotation line-items, etc.) is real product surface for a later
phase, not something onboarding should invent a parallel data model for.
When that catalog phase happens, migrating `StudioSetting["services"]` /
`["packages"]` JSON into real relational tables is the intended path.

## The `Client` model

`customer_import` needed somewhere real to write imported rows.
`packages/billing/docs/subscription-licensing.md` (Phase 8) had already
flagged `maxClients` as a "reserved" plan-limit dimension with no backing
model. Rather than staging imports in JSON too, this phase adds a
deliberately minimal `Client` model — name/email/phone/source/notes, no
booking or quotation relationships (those don't exist yet) — closing that
gap without pretending to be a full CRM module.

## Progress, skipping, and the checklist

`computeProgress()` counts a step as "accounted for" whether it was
completed *or* skipped — someone who skips 8 optional steps shouldn't see
their percentage stuck. `isComplete` requires every `required` step to be
in `completedSteps` specifically (skipping a required step is rejected by
`assertCanSkipStep()` — `final_review`, `branch`, `subscription`,
`studio_name`, and `owner_account` can't be skipped).

`buildSetupChecklist()` is a separate, persistent view of the same data —
meant for a "finish setting up your studio" widget on the real dashboard
(a later phase), not just the wizard itself. A studio that finished the 5
required steps but skipped WhatsApp setup still sees that as an
outstanding checklist item, not silently dropped.

## Resume later

`OnboardingSession.id` is persisted to the browser's `localStorage`
(`bcp_onboarding_session_id`) — closing the tab and reopening
`/onboarding` later picks the same session back up automatically, no
login required (steps 1–2 happen pre-auth by definition). The session
also has a `resumeToken`, a separate opaque value meant for an emailed
"continue setting up your studio" link that works from a different
browser or device entirely; nothing currently emails that link
automatically (a future "abandoned onboarding" nudge email is the natural
place to send it), but the token and the `GET /onboarding/resume/:token`
endpoint both exist and are tested.

## Guided tour

A 4-slide dismissible welcome tour (`apps/studio-web`'s
`GuidedTour` component) shown once per browser, tracked via a separate
`localStorage` key so it doesn't reappear for someone starting a second
studio later. It's an upfront overview rather than page-anchored
spotlight tooltips — the wizard's own layout is still forming on the very
first step (there's nothing yet to point a spotlight at), so a short
"here's what to expect" sequence serves better than a mid-form
interruption.

## Sample data

`SAMPLE_SERVICES`, `SAMPLE_PACKAGES`, and `SAMPLE_CUSTOMERS` in
`sample-data.ts` are pure data — the "Use sample services" /
"Fill with sample customers" buttons on individual steps use them to
pre-fill a form, and the final review step's "Add sample data" button
calls `POST /onboarding/:id/sample-data`, which writes all three at once
via `seedSampleData()`. This is meant for someone who wants to click
around the product before entering anything real — it's additive (safe
to click even after entering real services/customers) and clearly labeled
`source: "sample"` / `source: "import"` vs. `"manual"` on `Client` rows so
it's easy to tell sample data apart from real data later.

## Known simplifications

- **`payment_gateway`** only records which provider a studio *wants* —
  actually connecting Razorpay or Stripe (OAuth, API key exchange,
  webhook registration) is a real integration that belongs in
  Settings → Payments, not something a five-field onboarding step can
  complete on its own.
- **`subscription`** records the studio's plan *preference* as a
  `StudioSetting`. The live `Subscription` row is already created on the
  Starter trial during provisioning — actually changing plans mid-trial
  is a billing action with payment implications (see
  `packages/billing/docs/subscription-licensing.md`), so this step
  doesn't trigger that directly.
- **`services` / `packages`** are v1 `StudioSetting` JSON, not a real
  catalog module yet (see "Staged vs. live steps" above).
