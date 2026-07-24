# BCP Studio OS

A white-label photography SaaS platform, built as a Turborepo monorepo. Foundation, multi-tenancy, auth, branding, custom domains, platform admin, billing/licensing, and a guided studio onboarding wizard are in place, alongside the full day-to-day CRM (leads, clients, quotations, bookings, events, task/workflow engine, team/attendance, equipment, vendors/expenses/profit, invoicing, WhatsApp/email/notifications) and the guest-facing product surface (photo galleries with bulk upload and AI face recognition). See the section headers below for what each phase added, and [docs/deployment.md](docs/deployment.md) for how it all layers together.

## Structure

```
bcp-studio-os/
├── apps/
│   ├── marketing-web/      Next.js — public marketing site
│   ├── platform-admin/     Next.js — internal console (tenants, licenses, plans)
│   ├── studio-web/         Next.js — the CRM studios use day-to-day
│   ├── client-portal/      Next.js — a studio's clients track bookings/payments
│   ├── gallery-web/        Next.js — photo gallery delivery & selection
│   ├── docs-web/           Next.js — product/API documentation
│   ├── status-web/         Next.js — public status page
│   ├── api/                Fastify — core REST API
│   └── worker/             BullMQ — background job processing
├── packages/
│   ├── ui/                 Shared shadcn/ui component library + responsive design system (Storybook)
│   ├── database/           Multi-tenant Prisma schema (185 models), migrations, tenant-scoped client
│   ├── auth/                Authentication primitives (passwords, JWT, OTP, 2FA, tenant resolution)
│   ├── config/              Env validation (zod), tsconfig & tailwind presets
│   ├── types/                Shared domain types
│   ├── validation/           Shared zod schemas
│   ├── email/                Email: SMTP/SES/Resend client, template rendering, retry/bounce, unsubscribe
│   ├── notifications/        Channel-agnostic notification routing: preferences, dispatch decisions
│   ├── gallery/              Photo gallery: access control, download permissions, variant resolution, layouts
│   ├── upload/               Bulk photo upload: chunk planning, progress/retry, duplicate detection
│   ├── whatsapp/             WhatsApp Cloud API: client, template preview, retry, consent, functions registry
│   ├── storage/              S3-compatible object storage (MinIO/S3) — put/get/delete + multipart upload
│   ├── ai/                   Anthropic Claude client wrapper
│   ├── payments/             Razorpay/Stripe abstraction
│   ├── logger/                Structured logging (pino)
│   ├── permissions/           Role/permission catalog + RBAC engine + UI hooks
│   ├── billing/                Plan limits, usage warnings, license lifecycle
│   ├── branding/              White-label branding engine (theme resolution, CSS gen, versioning)
│   ├── domains/                Custom domain management (DNS, verification, secure hostname middleware)
│   ├── onboarding/              Studio onboarding wizard: 20-step registry, progress, validation, checklist
│   ├── dashboard/                Studio dashboard: 19-widget registry, layout/customization, quick actions
│   ├── leads/                     Lead management: pipeline, validation, duplicate detection, AI scoring
│   ├── enquiry-form/               Public enquiry form: field config, spam heuristics, UTM, link/embed builders
│   ├── clients/                     Client CRM: timeline registry, financials, relationship-score/AI heuristics
│   ├── catalog/                      Services & packages: default service registry, internal/customer pricing rule
│   ├── quotations/                    Quotation lifecycle: status pipeline, pricing, customer-facing view rule
│   ├── bookings/                       Booking management: 11-stage pipeline, pricing/margin, visual workflow
│   ├── events/                          Event & calendar: standard types, conflict detection, view helpers
│   ├── workflow/                         Task & workflow engine: default stages, dependencies, SLA, recurrence
│   ├── team/                             Team, attendance & freelancers: type mapping, workload, performance
│   ├── equipment/                        Equipment management: categories, checkout conflicts, expiry, valuation
│   ├── finance/                          Vendors, expenses & profit: categories, profit/receivables/payables, tax
│   ├── invoicing/                        Invoice, receipt & payments: FY/branch numbering, GST split, outstanding
│   ├── face-recognition/                 AI face recognition: AWS Rekognition provider abstraction, confidence/quality/consent
│   ├── photo-intelligence/               AI photo analysis: scoring, perceptual-hash duplicates, review/undo workflow
│   ├── culling/                          AI culling & album suggestions: priority weighting, presets, sequencing
│   ├── selection/                        Client photo selection: access gating, limits, lock/reopen/submit, export
│   ├── album-production/                 Album design pipeline: stage transitions, versioning, revisions, e-album access
│   ├── contracts/                        Contract templates & e-signature: clause registry, rendering, signing readiness
│   ├── commerce/                         Print product commerce: pricing, coupons, order totals, platform commission
│   ├── copilot/                          AI Studio Copilot: tool registry, permission gating, confirmation state machine
│   ├── marketing/                        AI Marketing Studio: content-type registry, language registry, prompt composition
│   ├── automation/                       Automation Builder: trigger/action registries, step-graph traversal, retry/rate-limit
│   ├── reports/                          Reports & analytics: 22-report registry, CSV export, schedule computation
│   ├── search/                           Global search: entity registry, provider abstraction, ranking
│   ├── data-portability/                 Import/export/backup: CSV parsing, column mapping, validation, approval state machine
│   ├── queue/                            Background job queues: 14-queue registry, retry/backoff, idempotency, job-status machine
│   ├── test-utils/                       Shared test infra: Testcontainers Postgres harness, AI provider mocks, webhook fixtures
│   └── observability/                    Monitoring: service registry, health aggregation, alert conditions, uptime, log redaction
├── infra/docker/            Extra infra assets (see docker-compose.yml at root)
├── docs/                    Setup, environment, build/test, deployment docs
└── turbo.json, pnpm-workspace.yaml, tsconfig.base.json, .eslintrc.json, .prettierrc.json
```

## Quick start

```bash
corepack enable
pnpm install
cp .env.example .env            # then copy into each app/package that needs it — see docs/environment.md
docker compose up -d            # postgres, redis, minio, mailpit
pnpm db:generate
pnpm db:migrate
pnpm dev                        # runs every app in parallel via Turborepo
```

Full details: [docs/setup.md](docs/setup.md) · [docs/environment.md](docs/environment.md) · [docs/build-and-test.md](docs/build-and-test.md) · [docs/deployment.md](docs/deployment.md) · [docs/navigation.md](docs/navigation.md) · [docs/accessibility.md](docs/accessibility.md) · [packages/ui/README.md](packages/ui/README.md)

## Data model & multi-tenancy

`@bcp/database` holds the full platform + multi-tenant schema (35 Prisma
models: platform RBAC, studio identity/RBAC, billing & licensing, audit &
ops) behind a tenant-scoped Prisma client that auto-injects and validates
`studioId` on every query. See
[packages/database/README.md](packages/database/README.md),
[packages/database/docs/er-diagram.md](packages/database/docs/er-diagram.md),
[packages/database/docs/tenant-isolation.md](packages/database/docs/tenant-isolation.md),
and [packages/database/docs/database-conventions.md](packages/database/docs/database-conventions.md).


## Subscription & licensing

Five plans (Starter, Professional, Business, Enterprise, Custom) with all
16 required limit dimensions (users, branches, storage, leads, clients,
events, galleries, monthly uploads, AI face searches, AI analysis jobs,
WhatsApp messages, email messages, custom domains, white-label access,
API access, automation runs), warned at 70/85/95/100% usage via real
in-app notifications, and enforced at every wired integration point (user
creation, domain creation, and an AI-job worker demonstrating the
worker-side pattern). One-year license keys support unique activation
keys, start/expiry dates, max activations, allowed-studio and
allowed-domain restrictions, full activation history with device/IP
metadata, and revoke/suspend/renew/grace-period lifecycle management. See
[packages/billing/docs/subscription-licensing.md](packages/billing/docs/subscription-licensing.md).

## Platform Super Admin

`apps/platform-admin` is a fully separate application — separate login
(`/platform-auth/*`), separate session cookies, separate `PlatformUser`/
`PlatformRole` identity and permission tables entirely distinct from
Studio CRM's `StudioUser`/`StudioRole` — for BCP Studio OS's own staff to
run the business. All 16 dashboard metrics (studio counts, MRR/ARR,
renewals/churn, storage/AI/WhatsApp/email usage, payment success rate,
failed jobs, system health) and all 18 modules (Studios, Users, Plans,
Subscriptions, Licenses, Activations, Payments, Domains, Storage, AI
Providers, Messaging Providers, Feature Flags, Announcements, Support
Requests, Audit Logs, System Configuration, Job Monitoring, Health
Monitoring) are wired to real, tested backend endpoints — not mocked. See
[docs/platform-admin.md](docs/platform-admin.md).

## Custom domains

Studios can point their own domains at five surfaces — Studio CRM, Client
Portal, Public Gallery, Public Enquiry Form, and the white-label root
website — with TXT/CNAME ownership verification, progressive retry
scheduling, SSL status tracking, explicit activation, per-purpose primary
domains, soft-deletable removal, and full audit history. A secure
hostname middleware validates every incoming Host header (rejecting
host-header-injection attempts), resolves the owning studio, rejects
suspended studios, applies subscription/feature restrictions, and applies
branding + tenant context — all before a request reaches authentication
or routing. Provider setup guides for Cloudflare, Vercel, Nginx, and AWS
Route 53 are included. See
[packages/domains/docs/custom-domains.md](packages/domains/docs/custom-domains.md).

## White-label branding

Every studio can fully re-skin the product — logos (default/light/dark),
favicon, full color and typography tokens, button/card style, login
background, email header/footer, invoice/receipt design, gallery/client
portal themes, watermark, and contact/social/legal footer content — with
platform-default → studio → branch-level override resolution, live
CSS-variable generation that re-themes `@bcp/ui` product-wide, WCAG
contrast validation, versioned history with rollback, and caching. See
[packages/branding/docs/branding.md](packages/branding/docs/branding.md).

## Authentication & permissions

Email/password, Google OAuth, email OTP, email verification, password
reset, TOTP two-factor with recovery codes, session management with
device history and logout-everywhere, login history, escalating account
lockout, and per-route rate limiting are all implemented in `@bcp/auth`
(protocol primitives) and wired into `apps/api`. Platform RBAC (5 roles),
studio RBAC (11 roles, plus custom roles), branch-level access, resource/
feature/plan permission checks, and API guards live in `@bcp/permissions`,
with a `@bcp/permissions/client` React hook for UI-side conditional
rendering. `studioId` is never trusted from the browser — every
authenticated request re-resolves it from session + verified hostname +
active membership. See [docs/authentication.md](docs/authentication.md).

## Studio onboarding

A 20-step guided wizard (`@bcp/onboarding` for the step registry/progress/
validation/checklist logic, `apps/studio-web/onboarding` for the UI) takes
a new studio from "just an email" to fully set up: owner account and
studio name (which provisions a real Studio, owner `StudioUser`, trial
Subscription, and default branch in one transaction), business/GST/bank/
UPI details, logo and brand colours, email and WhatsApp sender identity,
team invitations, a services/packages starter catalog, customer import,
storage/payment-gateway/custom-domain setup, a subscription plan choice,
and a final review. Owner account and studio name are staged in
`OnboardingSession.stepData` since no Studio exists yet at that point;
every step after provisioning writes straight to the real tables (or
`StudioSetting` for the handful of fields — GST, bank, UPI, services,
packages, payment gateway — that don't have a dedicated model yet) via
the platform's existing branding/domains/billing/team APIs rather than a
separate onboarding-only data path. Only 5 steps are required (owner
account, studio name, branch, subscription, final review); the rest are
skippable and trackable via a persistent setup checklist. Progress
persists server-side, so closing the tab and reopening `/onboarding`
later resumes exactly where you left off. See
[packages/onboarding/docs/onboarding.md](packages/onboarding/docs/onboarding.md).

## Studio dashboard

The studio CRM dashboard (`apps/studio-web`'s `/` route) surfaces 19
widgets — today's shoots, enquiries and follow-ups due, quotations and
invoices (pending/overdue), production pipeline status (editing, album
selection, printing, gallery delivery), storage usage, monthly revenue/
expense/profit, team availability, recent activity, and rule-based "AI
recommendations" — plus 8 quick actions (add lead, add client, create
quotation, record payment, create event, upload gallery, send reminder,
create invoice), all backed by a new minimal CRM data layer (`Lead`,
`Event`, `Quotation`, `Invoice`, `ClientPayment`, `Gallery`, `Album`,
`Expense`). Widgets are configurable (show/hide), reorderable via native
desktop drag-and-drop or mobile up/down controls, and responsive from a
single-column mobile stack to a 4-column desktop grid — one shared
`@bcp/dashboard` registry drives both the widget grid and the layout
persisted per team member. See
[docs/studio-dashboard.md](docs/studio-dashboard.md) for what's
deliberately still minimal (no line items, no real gallery pipeline) vs.
what's real.

## Lead management

The `/leads` page expands the dashboard's minimal Prompt 11 `Lead` model
into the full brief: bride/groom names, dual mobiles, dual Instagram
profiles, venue/city, budget vs. studio-estimated expected value, a
9-stage pipeline (new → contacted → qualified → meeting scheduled →
quotation sent → negotiation → booking pending → won/lost), and four
views — table, mobile card list (the same `ResponsiveDataView` component
renders both), kanban (native drag-and-drop between pipeline stages),
and a calendar by event date. Duplicate detection, bulk assign/status-
change, a notes thread, logged communication history, file attachments,
a timeline merging audit history + notes + communications, lost reasons,
one-click conversion to a real client record, and rule-based "AI" lead
scoring/budget prediction/package suggestions are all wired to real
endpoints. See [docs/lead-management.md](docs/lead-management.md) for
the Postgres enum migration this required and what's honestly still a
heuristic rather than a trained model.

## Public enquiry form

A studio-configurable public lead-capture form, resolved by
`(studioSlug, formSlug)` at `apps/client-portal`'s `/enquire/[studioSlug]/
[formSlug]` — genuinely white-label, since it applies the studio's real
brand theme (logo, colors, typography) via the same CSS-variable
appliers galleries and the client portal already use. Studios configure
title, description, cover image, which lead fields to show/require,
event types, preferred contact methods, consent text and terms, success
message, auto-response, and default lead assignment from a builder in
`apps/studio-web`, then get a public link, an iframe embed snippet, and
a downloadable QR code. Every submission runs through validation against
that form's own required fields, spam heuristics (honeypot, fill-time,
submission velocity) layered under a hard per-IP rate limit, duplicate
detection against existing leads, real lead creation with UTM/consent
recorded on a separate submission audit row, and notifications to the
studio's owners/admins, the assigned salesperson, and (optionally) an
auto-response to the enquirer. See
[docs/enquiry-form.md](docs/enquiry-form.md).

## Client CRM

The `/clients` page expands the minimal Prompt 9 `Client` into a full
profile: couple details, family contacts, billing/shipping addresses,
GST details, social profiles, important dates, tags, and referral
tracking (a self-relation, so a client can be linked to who referred
them and you can see who they've referred in turn). A 15-type timeline
— enquiries, calls, messages, meetings, quotations, bookings, events,
contracts, invoices, payments, galleries, album selections, print
orders, deliveries, feedback — aggregates from tables that already
exist for their own reasons rather than duplicating events into a new
one, the same approach the lead timeline uses. Lifetime value and
outstanding amount are computed from real payment/invoice data;
relationship score, AI summary, and recommended next action are
rule-based heuristics in this phase, documented plainly as such rather
than oversold. See [docs/client-crm.md](docs/client-crm.md).

## Services & packages catalog

`/services` and `/packages` let a studio build its sellable catalog —
the 16 standard services from the brief are one-click seed data (every
seeded row becomes a completely normal, renameable/repriceable
`Service` afterward), bundled into `Package`s with their own
customer-facing total, deliverables, duration, team requirement, add-ons,
tax rate, discount ceiling, payment schedule, and terms. The catalog's
one hard rule — individual service prices never appear in anything a
customer sees unless a studio explicitly turns on item-level pricing for
that package — is enforced in exactly one function
(`buildCustomerFacingPackageView()`) that every customer-facing surface
is expected to go through, with a dedicated test asserting the internal
prices don't leak into the serialized output when the flag is off, not
just that a field is empty. See
[docs/services-and-packages.md](docs/services-and-packages.md).

## Quotation management

`/quotations` builds on the catalog directly: a quotation can be
generated from a `Package` (snapshotting its services' prices at that
moment, so a later repriced service never rewrites a quotation already
sent) or built line-by-line. The same pricing-visibility rule from
Prompt 15 governs quotations too — `buildCustomerFacingQuotationView()`
is the one function every customer-facing surface (PDF, the public
`apps/client-portal` web link, email/WhatsApp send) must go through.

7-stage pipeline (draft → sent → viewed → accepted → converted, plus
rejected/expired), with "viewed" set automatically the first time the
public link opens rather than picked from a dropdown. The public page
lets anyone with the link view the quote, but committing to Accept or
Reject requires OTP verification of the email or phone on file — a
digital-approval record captures the decision, a typed name as a
lightweight e-signature, and the same IP/timestamp audit trail every
view already gets. Revision history stores a full snapshot on every
edit; clone and convert-to-booking (which creates or confirms an Event
and moves a linked lead to "won") round out the lifecycle. On mobile,
the public page shows a sticky Accept/Reject bar. See
[docs/quotation-management.md](docs/quotation-management.md).

## Booking management

`/bookings` — created automatically when a quotation is accepted and
converted. `Booking` is the "spine" tying that quotation to everything
after it: the `Event`(s) it covers (a booking can span several — an
engagement shoot, the wedding, a reception), a booking-level team
assignment, its own payment schedule (the plan, distinct from actual
invoices/payments), a linked contract, and internal cost/selling price/
estimated profit resolved from the quotation at conversion time. Line
items and the payment schedule are snapshotted, not referenced, so a
booking in progress doesn't shift if the source quotation changes
afterward. An 11-stage pipeline (draft → awaiting advance → confirmed →
in progress → editing → client selection → album design → printing →
delivery → completed/cancelled) is visualized as a clickable workflow
stepper, plus a timeline aggregating the booking's audit history with
everything happening across its linked events. See
[docs/booking-management.md](docs/booking-management.md).

## Event & calendar management

`/events` expands the shoot record with full day-of detail: venue,
structured address plus map coordinates, contact person, dress/travel/
accommodation notes, deliverables, a shot list (a description and a
completed flag, not a rigid taxonomy — studios' shot lists vary too
much in style to force into fixed fields), and an intra-day schedule
("10:00 AM hair & makeup"). An equipment catalog (`Equipment`) tracks
how many units a studio owns, so double-booking only fires once
concurrent demand actually exceeds that count. Six views share one
page — List, Agenda (mobile's default, detected once via a media
query), Calendar, Timeline, Kanban, and Map (links out to Google Maps
per event rather than an embedded map, which would need an API key this
environment doesn't have configured). Conflict detection covers all
four cases named in the brief — team, equipment, date/time, and travel
overlap (different-venue events too close together for a person to
realistically get between them) — as pure, independently tested
functions that surface warnings rather than hard-blocking a save. See
[docs/event-calendar-management.md](docs/event-calendar-management.md).

## Task & workflow engine

`/workflows` and `/tasks` — a customizable, per-event-type workflow
system. `WorkflowTemplate` + `TaskTemplate` are the reusable blueprint a
studio designs once (one template per event type, plus a studio-wide
default); `WorkflowInstance` + `Task` are what's created every time a
template is *applied* to a real booking or event, with every task
snapshotted from its template at that moment so editing the template
later never rewrites work already in flight. The 17-stage default
workflow named in the brief (Enquiry through Completion) is one-click
seed data, wired as a linear dependency chain so it's immediately
usable, not just a flat task list. Dependencies are checked before a
task can start or complete (a cancelled prerequisite doesn't count as
satisfying one) and checked for cycles at template-authoring time; SLA
deadlines and escalation are resolved on every read rather than a
scheduled job; recurring tasks spawn their next occurrence the moment
they're completed, using real calendar arithmetic. See
[docs/task-workflow-engine.md](docs/task-workflow-engine.md).

## Team, attendance & freelancers

`/team` — full HR profiles for the studio's team. The brief's 8 "types"
map onto what already existed rather than a new classification:
Employee/Freelancer is a genuinely new field
(`StudioUser.employmentType`), while Photographer/Videographer/Editor/
Designer/Salesperson/Accountant are the functional `StudioRoleKey`s
already defined since the auth phase. Sensitive HR data (salary,
freelancer rate, bank details, emergency contact) lives in a separate
one-to-one profile table so a plain team list never has to pull it
along. Workload and task completion are computed live from real task/
event data, never stored; event conflict warnings reuse Prompt 18's
conflict detection directly rather than reimplementing it, just scoped
to one person's whole schedule. Attendance, leave (with overlap
checking), qualitative performance notes, and freelancer payment
tracking (the mirror image of client payments — money going out, not
coming in) round out the feature. See
[docs/team-attendance-freelancers.md](docs/team-attendance-freelancers.md).

## Equipment management

`/equipment` expands the Prompt 18 minimal asset record into a full
register: serial number, purchase details, warranty/insurance with
live expiry tracking, condition, replacement cost, and a printable QR
code. Three distinct "who has this" models coexist without replacing
each other — per-event booking (Prompt 18), long-term team custody
(Prompt 20), and a new short-term QR-driven checkout log with an
expected return time, which is what actually enforces the brief's
double-booking prevention (a hard block here, since a specific physical
item already checked out is a plain impossibility, not a judgment call
like the softer event-scheduling warnings). Maintenance, repair (status-
tracked, auto-updates the equipment's overall status), rental
(deliberately bidirectional — rented out or rented in, one model), and
damage reports round out the asset's history. A studio-wide overview
computes total replacement value and flags anything expiring soon, live
on every read. See
[docs/equipment-management.md](docs/equipment-management.md).

## Vendors, expenses & profit

`/vendors`, `/expenses`, and `/finance` — a vendor register (11
suggested categories), deliberately single-line purchase orders,
vendor bills (the payable-side mirror of client invoices, with the
same GST/TDS fields), and a full expansion of `Expense` — event vs.
general is just whether an event/booking is linked, not a separate
type flag; receipts, approval (opt-in per expense, not a blanket
requirement), recurring (spawns its next occurrence on completion, the
same pattern recurring tasks use), and payment status round it out.
Profit is computed by the same shared functions at both the event level
and the studio level, so the two views can never quietly disagree;
receivables and payables are always a current snapshot rather than
date-filtered, since "what's owed right now" isn't a period-scoped
question the way revenue and cost are. See
[docs/vendors-expenses-profit.md](docs/vendors-expenses-profit.md).

## Invoice, receipt & payments

`/invoices` — full billing document management. Proforma/tax/non-GST
invoices are one `Invoice.documentType`; Receipt, CreditNote, and
RefundReceipt are separate models since they aren't invoices at all.
Numbering is branch- and financial-year-aware
(`INV/MUM/2026-27/0001`), with India's April–March fiscal year
resolved correctly. GST splits into CGST+SGST (intra-state) or IGST
(inter-state) by standard mechanics, not studio policy. The one hard
rule in the brief — every payment generates a receipt — is enforced by
recording the payment and creating its receipt in the same database
transaction, not left to a service function remembering an extra step.
Payment method is the one category-shaped field in this whole schema
that stays a real database enum rather than free text, because it
drives actual logic (whether a gateway reference applies) the way a
vendor or equipment category never does. See
[docs/invoice-receipt-payments.md](docs/invoice-receipt-payments.md) —
which also documents a naming collision this phase caught and fixed
before it shipped, with the pre-existing platform billing package left
fully intact.

## WhatsApp integration

`/whatsapp` — full per-studio WhatsApp Business Cloud API integration,
replacing the env-var-based single global sender quotation and invoice
distribution used before this phase. `WhatsAppConfig` holds one
studio's own Meta credentials; every one of the 14 message types named
in the brief (quotation, invoice, receipt, gallery, payment reminder,
booking confirmation, and so on) routes through one send path that
checks opt-out status, checks the plan's monthly message limit (reusing
Prompt 6's usage infrastructure directly, no new tracking built), logs
a `WhatsAppMessage` row before attempting the send so failures are
never silently lost, then attempts it. Delivery status
(queued→sent→delivered→read, or failed) only ever advances forward, and
only from the webhook handler matching Meta's callbacks back to a
studio and message — never invented client-side. Retry is capped at 3
attempts with exponential backoff; a message still queued isn't
retryable, only one that's genuinely failed. See
[docs/whatsapp-integration.md](docs/whatsapp-integration.md).

## Email and notifications

`/email` and `/notifications` — centralized communication
infrastructure, closing out the platform's channel coverage. `EmailConfig`
supports all four providers named in the brief (platform SMTP needing
no studio setup at all, studio's own SMTP, Amazon SES, Resend — Resend
fully wired via its REST API, SES an honest credentials-shaped
limitation like Razorpay/Cashfree before it); templates use named
`{{variable}}` placeholders (matching HTML email convention, distinct
from WhatsApp's numbered `{{1}}` syntax); every email is wrapped in the
studio's own branding and logged with full delivery tracking
(queued→sent→delivered→bounced/failed, with bounces never retried since
that only damages sender reputation). `NotificationPreference` gives
each user a real on/off toggle per channel — in-app, email, WhatsApp,
browser push, PWA push — with in-app always on regardless of
preference, since suppressing a user's own notification center would
hide a notification everywhere with no way to see it. The dispatch path
(`notifyUser()`) routes through the exact same `sendEmail()`/
`sendWhatsAppMessage()` every other feature already uses — no parallel
notification-only send logic to keep in sync. Web Push subscription
storage is fully implemented; actual push delivery needs VAPID keys
this environment doesn't have configured. See
[docs/email-and-notifications.md](docs/email-and-notifications.md).

## Photo gallery

`apps/gallery-web`'s `/g/[token]` — the platform's other public-facing
surface alongside the client portal. Expands the Prompt 11 gallery
status tracker into the real product: a unique link and QR code,
password/OTP gating (checked through one access-gate function, expiry
always wins first), original/compressed download with per-guest limits,
watermark settings, favorites and comments (both keyed by an opaque
guest token stored in the browser — a guest never needs an account),
and five layouts (grid/masonry/story share one component driven almost
entirely by CSS; timeline is the one layout with a genuinely different
day-grouped data shape; highlights just reorders favorites-first).
Studio branding and custom-domain resolution reuse the exact
`/public/branding` endpoint and theming helper the client portal
already relies on. Swipe, pinch-zoom, and native share in the
full-screen lightbox are built directly on raw touch events and the Web
Share API rather than a new dependency. Studio-side photo upload
started as a "paste a storage key" placeholder in this phase and was
replaced by a real chunked upload pipeline in the very next one — see
[Bulk photo upload](#bulk-photo-upload) below. See
[docs/photo-gallery.md](docs/photo-gallery.md).

## Bulk photo upload

Fills in exactly the gap Photo Gallery's docs flagged as deliberately
out of scope: a real chunked/multipart upload pipeline. Every chunk
uploads directly from the browser to storage via a presigned S3 part
URL — `apps/api` orchestrates but never proxies the bytes — using
`@bcp/storage`'s real multipart API (create → per-part presigned URL →
complete/abort), not a bespoke chunking scheme. An `UploadSession`
persists server-side with per-chunk state, so pause/resume/retry are
just status flips and retrying only re-sends chunks that never landed.
The one honest constraint: a browser reload discards the actual `File`
object (nothing in the web platform persists raw file bytes across a
reload), so a session that survives a reload shows as "needs file"
until reselected — checksum-verified against what the session recorded
before any chunk resumes, so it can never silently continue with the
wrong file. Duplicate detection happens client-side before a single
byte transfers: a SHA-256 checksum is checked against both delivered
photos and any other in-flight upload for the same gallery. Once the
last chunk lands, `sharp` and `exifr` generate every derivative the
brief asks for — thumbnail, preview, web version, a filtered EXIF
allowlist (deliberately excluding GPS data a studio may not realize
would otherwise be embedded), and a tiny blurred base64 placeholder —
the original reference is just the storage key the upload already
wrote to. See [docs/bulk-photo-upload.md](docs/bulk-photo-upload.md).

## AI face recognition

`apps/gallery-web`'s "Find my photos" — a guest scans their face or
uploads a selfie to find themselves across a gallery's photos, using
AWS Rekognition behind a real provider abstraction
(`FaceRecognitionProvider`, with `RekognitionProvider` as the only
implementation — nothing in the search flow touches the AWS SDK
directly). The brief's strictest rules are enforced structurally, not
by convention: one Rekognition collection exists **per gallery**, never
shared across galleries or studios, so a search physically cannot reach
photos outside the one gallery a guest is looking at. Consent is
recorded the moment a guest accepts the privacy notice, independent of
whether they go on to search. The selfie itself is never written to
persistent storage at any point — processed in memory for one request
and then simply out of scope, the strongest possible reading of
"selfies must not remain permanently." Multiple-face and low-light
warnings come from Rekognition's own face-quality scoring, checked
*before* a search is attempted so a bad capture never costs a wasted,
usage-metered search call; manual correction removes a wrong match
without ever touching the underlying face index. See
[docs/ai-face-recognition.md](docs/ai-face-recognition.md).

## AI photo intelligence

A studio-side triage pipeline scoring every delivered photo for blur,
exposure, noise, faces (count/closed-eye/smile), composition, scene,
and duplicates — real computer-vision measures throughout, not stubs:
Laplacian-variance sharpness, mean-luminance exposure, a 64-bit
difference-hash for duplicate/near-duplicate clustering, the Prompt 28
face-recognition provider abstraction extended with a new
`detectFaceAttributes()` method for smile/eyes-open, and Claude vision
for the composition/scene/moment-tagging half that pixel math alone
can't judge. Every result carries confidence and explanation, always —
even a malformed AI response produces a real, clearly-labeled
low-confidence fallback rather than silently skipping a photo. Approve/
reject/undo/bulk-review all route through one append-only review log
(never overwriting status blindly), with bulk actions sharing one batch
ID so a 40-photo bulk approval undoes as a single operation. The
brief's one hard rule — **never delete photos automatically** — is
enforced structurally: no code path in this entire review flow, from
individual review through bulk-undo through duplicate-group review,
ever touches `GalleryPhoto` itself. See
[docs/ai-photo-intelligence.md](docs/ai-photo-intelligence.md).

## AI culling and album suggestions

The layer above photo intelligence: instead of scoring individual
photos, this composes those same signals (quality score, technical
issues, duplicate groups, face detections) into higher-level curation —
which photos are worth delivering at all, and which of those belong in
a specific album, in what order, with what cover. Seven presets
(wedding/engagement/baby/maternity/birthday/corporate/school) each
configure the same four priorities differently — a wedding leans on
emotional moments and people balance, a corporate gallery leans on
technical quality and pose variety — and a studio can manually adjust
any of them, always renormalized so the combination stays internally
consistent. "Protect emotional moments" is a real safeguard: an
emotional-moment flag can only ever pull a recommendation *up*, never
down, and a duplicate/repeated-pose penalty can never push a protected
photo to a hard exclude, only floor it at "needs review" so a studio's
own eyes make the final call. Album sequencing defaults to
chronological order — the honest read of an event's natural narrative
arc — and "balance people and rituals" allocates an album's target
photo count proportionally across the moment categories actually
present, rather than risking 40 ceremony shots and zero reception
candids just because the ceremony happened to be better-lit. Every
verdict is reviewable or directly overridable, and — the brief's one
hard rule — **original photos are never deleted automatically**,
enforced the same structural way as Prompt 29: no function in this
entire pipeline ever touches `GalleryPhoto` itself. See
[docs/ai-culling-and-albums.md](docs/ai-culling-and-albums.md).

## Client photo selection

`apps/client-portal`'s `/select/[token]` — expands `Album` from a
Prompt 11 status tracker into the real client-facing selection
experience: a secure OTP-gated link where a client picks which
delivered photos go into their final album. Selection and category
limits are checked independently so a client learns which one stopped
them; favorite, select, and reject are deliberately independent states
(a photo can be favorited without counting toward the limit); every
action appends to an append-only selection history rather than only
showing final state. Submitting **is** locking — set together in one
transaction, since there's no meaningful "submitted but still open"
state — and only a studio can reopen a locked selection. Export
filenames and CSV export resolve the *original* upload's filename
(Prompt 27), the name a lab or designer actually needs, not an internal
storage key; downloads hand back true originals, never the
compressed/preview variant browsed while selecting. The mobile
experience is real, not an afterthought: large thumbnails capped at
2–3 columns, a sticky selected-count bar, a swipeable full-screen
viewer, `localStorage`-backed session resume so closing the tab and
coming back later picks up right where a client left off, and an
explicit confirmation dialog before the one action that locks
everything. See
[docs/client-photo-selection.md](docs/client-photo-selection.md).

## Album design and 3D e-album

The production workflow that picks up once a client's selection locks
— designer assignment through delivery, across 11 stages that aren't
strictly linear (a revision request can loop back to a new design
round or straight to another client review). Spread upload and
versioning are the same mechanism: every re-upload of a page gets the
next version number for *that page specifically*, with only one
version ever current. Page comments and pinned annotations are the
same model, distinguished only by whether a position was given.
Whole-album approval requires every current spread to individually be
approved first — a studio can't override unresolved page-level
feedback with one blanket action. Revision rounds are checked against
a configurable limit, consumed the moment a round is requested
regardless of outcome. Print orders carry real specifications (size,
paper stock, binding, cover material — a JSON blob rather than typed
columns, since a print spec's shape genuinely varies by lab), plus lab
contact details and courier tracking, with dispatch and delivery each
advancing the album's own production stage automatically. The 3D
e-album viewer at `apps/gallery-web`'s `/ealbum/[token]` is a
deliberately separate link from selection — its own password, its own
OTP toggle, its own download control — since a finished album is
typically shared far more widely than a selection link (WhatsApp share
routes through the platform's own tracked send path, Prompt 24, not a
bare link). The page-flip viewer itself reuses the exact swipe and
pinch-to-zoom gesture handling the gallery lightbox already
established, applied per-page instead of per-photo. See
[docs/album-design-and-ealbum.md](docs/album-design-and-ealbum.md).

## Client portal

`apps/client-portal`'s `/portal/[studioSlug]` — a white-label,
OTP-authenticated account portal covering every client action named in
the brief in one dashboard: profile, bookings, events, quotations (+
accept), contracts (+ sign, via a typed name and timestamp — the same
lightweight mechanism this codebase already uses in place of a
captured signature image), invoices (+ an honest self-report payment
flow, since no live payment gateway is wired up — a documented gap
since Prompt 23 — landing as a normal `ClientPayment` a studio then
confirms), receipts, galleries, and albums (deep-linking into the
existing selection and e-album experiences from Prompts 31–32 rather
than rebuilding them), plus support requests. `ClientPortalSession` is
a genuinely different kind of session from every other guest-token flow
in this codebase — scoped to the *client relationship itself*, not one
gallery or album, so a single OTP login surfaces everything that client
has with the studio. Every query in the backend service filters by
both studio *and* client, since this is the one place tenant isolation
alone isn't enough. The dashboard leads with a compact mobile-first
summary and a sticky bottom tab bar rather than a desktop sidebar;
branding and custom-domain resolution reuse the same `/public/branding`
lookup every other public surface already relies on. See
[docs/client-portal.md](docs/client-portal.md).

## Contracts and e-signature

Expands `ClientContract` into full contract management — studio-owned,
reusable templates (`ContractTemplate`'s `sections` field is an
ordered JSON array rather than six dedicated clause columns, since real
contract text is free-form legal prose a studio writes and reorders,
not data that fits a rigid schema) with named `{{variable}}`
placeholders for event details, payment/cancellation/delivery/
copyright terms, model release, and privacy consent — the same
convention `EmailTemplate` already established. A contract is only
ever finalized once genuine OTP verification has landed and, when the
template calls for one, a separately-signed witness has completed
their own step too — a typed name alone is never sufficient, checked
by one shared `isReadyToFinalize()` function. Signing automatically
generates a PDF certificate carrying the signer's name, IP address,
timestamp, and OTP-verification proof. Every content change creates a
new, permanent `ContractVersion` row — nothing is ever overwritten, so
what a client actually saw when they signed is always recoverable —
and an entirely separate, append-only `ContractAuditLogEntry` trail
covers the full lifecycle from creation through certificate generation.
See [docs/contracts-and-esignature.md](docs/contracts-and-esignature.md).

## Print products and commerce

A full product catalog on top of the gallery/photo infrastructure —
softcopies, prints, albums, frames, canvas, acrylic, calendars, photo
books, and gift products, each with size/finish/quantity variants
priced independently. Price resolution follows one fixed order of
specificity: an event-specific override (a wedding package's bundled
prints, priced differently from the same product sold standalone) wins
outright, otherwise a selected variant's own price wins over the
product's base price — never averaged, never combined. Coupons are
entirely studio-owned, consistent with this codebase's established
"each studio manages its own X" pattern, and report a distinct reason
for every way they can fail rather than one generic error. Order
totals compose discount, tax (including shipping), and platform
commission in a fixed sequence, with commission computed on top of what
a client pays, never subtracted from it. The commission requirement
itself is a real, working default: `PlatformCommerceSettings` defaults
to disabled and zero, and even a pre-configured non-zero percentage
resolves to a hard 0 until a platform admin explicitly turns it on —
"configurable for the future" is a genuine code path here, not a
placeholder. Every order snapshots the commission rate it was actually
charged, so a later platform-wide fee change never retroactively
reinterprets an already-placed order. Lab export produces one CSV row
per item with the true original photo file for anything print-based —
never a compressed or watermarked variant — and flags a missing
original explicitly rather than leaving a blank a lab could miss. See
[docs/print-products-and-commerce.md](docs/print-products-and-commerce.md).

## AI Studio Copilot

`apps/studio-web`'s `/copilot` — a conversational agent over a
studio's own data, answering natural-language queries (tomorrow's
events, overdue payments, which clients haven't selected album photos,
a client summary, which editor is overloaded, a revenue forecast,
low-profit events, a package suggestion for an enquiry) with real data
cited by source reference, never invented. The brief's hardest
requirement — **never allow cross-tenant AI context** — is enforced at
two independent layers neither the model can influence: no tool's
schema has a `studioId` field for the model to fill in, and every tool
implementation takes `studioId` as an explicit parameter supplied only
by the authenticated request, never by the model's own output. A write
action (drafting a quotation, a payment reminder, or a wedding shot
list) is never executed inline — it's always persisted as a draft
first, and only a human confirming it moves it to executed, a real
state machine that has no path skipping the human step. Reversal data
is captured at the moment an action executes, not reconstructed later,
so undoing a copilot-created shot list deletes exactly the items it
created. Every tool call is checked against the *acting user's own*
granted permissions — the copilot is not a privilege-escalation path —
and an append-only audit log records every query, tool call, and
action independent of the conversation transcript itself. Built across
four phases: read-only, draft actions, confirmed actions, and
automation suggestions (a studio-level setting change rather than a
new tool capability). See
[docs/ai-studio-copilot.md](docs/ai-studio-copilot.md).

## AI Marketing Studio

`apps/studio-web`'s `/marketing` — AI-generated marketing content
across the 13 types named in the brief (Instagram captions, reel
scripts, hashtags, Facebook posts, Google Business posts, email and
WhatsApp campaigns, festival greetings, review requests, referral
campaigns, package descriptions, SEO titles, blog outlines) in five
languages (English, Tamil, Kannada, Telugu, Hindi), composed from every
input named in the brief — studio brand voice, service, city, target
audience, tone, offer, platform. "Studio brand voice" is deliberately
two things working together: an explicit tone profile a studio sets
directly, and up to a handful of the studio's own most recently saved
approved examples for that exact content type, included in the
generation prompt as few-shot material — the mechanism that actually
makes brand voice improve over time rather than stay a fixed
description forever. Saving an approved example links back to the
generation request it came from when applicable, or stands alone for a
hand-written example a studio pasted in from outside the tool — both
are equally valid going forward. Every request snapshots its own
inputs and output independently of whatever the brand voice settings
say later, so a subsequent brand-voice change never retroactively
reinterprets what an old request actually produced. See
[docs/ai-marketing-studio.md](docs/ai-marketing-studio.md).

## Automation Builder

`apps/studio-web`'s `/automation` — a visual trigger→action automation
system across the 16 triggers and 11 actions named in the brief
(including a genuine condition branch and a wait step), backed by a
real step graph rather than a strict linear sequence: every action has
at most one successor except `condition_branch`, which has two,
keeping the graph simple enough for a studio owner, not a developer, to
build and understand. Test mode is honored individually by every
action implementation — each one checks the flag itself and returns a
simulated result rather than a shared check at the top of the engine —
so a studio can safely verify a new automation before enabling it for
real. Enabling a rule validates the graph first (exactly one entry
point, no cycle) so an automation can't accidentally loop the moment
it's turned on. Rate limiting is per-rule, stopping a runaway
automation before it can exhaust a studio's usage allowance; usage
enforcement itself is platform-wide and reuses a plan-limit dimension
(`maxAutomationRunsPerMonth`) that already existed in the billing
system before this feature was built. Every step's execution is
recorded individually, with retry attempts (capped at 3, matching the
same ceiling this codebase already uses for WhatsApp and email sends)
and a clear failure point rather than a run that silently skips ahead
past what broke. Two scope boundaries are stated plainly rather than
hidden: `wait` steps are recorded but don't actually pause execution
(no job scheduler in this environment), and the 16 triggers aren't yet
wired to fire automatically from their real source events across the
rest of the codebase — the execution engine itself is complete and
reachable today via test-run and manual-run endpoints. See
[docs/automation-builder.md](docs/automation-builder.md).

## Reports and Analytics

`apps/studio-web`'s `/reports` — all 22 reports named in the brief
(leads through WhatsApp usage), every one sharing the same normalized
output shape, which is what lets a single CSV builder, a single PDF
renderer, and a single frontend table/chart component handle all of
them rather than 22 bespoke implementations. Date, branch, and user
filters apply uniformly across reports; saving a report snapshots
those filters at save time rather than a live reference to the
builder's current defaults, so reopening it later reproduces the exact
same query. Scheduled reports compute and store their own next-send
date — including correct month-end handling, so a report scheduled on
the 31st rolls to the last valid day of a shorter month rather than
overflowing — letting a scheduler find everything due right now with
one indexed comparison. "Responsive charts" and "data-table
alternatives" are both real: reports with a clean label-and-number
shape render as dependency-free, percentage-width bars that reflow at
any screen size, and everything else falls back to a plain data table
rather than being forced into a chart that wouldn't suit it. See
[docs/reports-and-analytics.md](docs/reports-and-analytics.md).

## Global Search and Command Menu

A cross-entity command menu (Cmd/Ctrl+K, mounted once globally so it
opens from any page) across all 13 entities named in the brief —
leads through equipment — built on the same provider-abstraction
pattern already proven out for face recognition and storage:
`SearchProvider` is a one-method interface, `PostgresSearchProvider`
is the only implementation today, and swapping in Meilisearch or
Elasticsearch later means writing one new class against the same
interface, not touching the command menu or the orchestration layer.
"Use PostgreSQL search first" is implemented honestly — `ILIKE`
substring matching described plainly as tolerant-of-partial-matches
fuzzy search, not oversold as similarity search this environment has
no live database to verify. Permission filtering resolves the
searchable entity set from the acting user's own granted role *before*
the provider is ever called; tenant filtering is structural, with
`studioId` coming only from the authenticated request all the way
through the natural-language path, where a free-text query like
"overdue invoices from last month" is translated into a keyword and
likely entity types by Claude and then run through the exact same
guarded pipeline every other search uses — never a separate, less-
guarded one. Recent and saved searches are scoped per individual user,
not just per studio. On a narrow viewport the command menu renders
full-screen rather than a centered dialog, a real breakpoint behavior
rather than a bolted-on mobile mode. See
[docs/global-search.md](docs/global-search.md).

## Import, Export and Backup

`apps/studio-web`'s `/data-tools` — CSV import across all 8 entity
types named in the brief with real column mapping (auto-suggested
where a source CSV's headers already line up), validation that
collects every problem in a row rather than stopping at the first, a
preview pass before anything is written, duplicate handling, a genuine
per-row error report, and retry that re-attempts only what previously
failed. CSV export across all 10 types including "complete studio
data," which isn't special-cased — it runs every other export type in
sequence and bundles the results, sharing the exact same CSV builder
`@bcp/reports` already established. The part built with the most care
is encrypted full-studio backup and restore: AES-256-GCM with the
encryption key coming only from a dedicated environment variable
(backups are unavailable, not silently unencrypted, if it's unset),
and Platform Admin approval enforced structurally rather than by
convention — `approvedBy` is routed exclusively through platform-level
permissions, and there is no code path anywhere that lets a studio
approve its own backup or restore request, no matter how senior
someone is within their own studio. Restore completes the full
two-step approval workflow and verifies a backup decrypts and parses
cleanly, but honestly stops short of re-inserting a snapshot into live
tables — reconciling a point-in-time backup against whatever's changed
since is a genuinely separate effort this pass names plainly rather
than fakes. See
[docs/import-export-backup.md](docs/import-export-backup.md).

## Progressive Web App

Both `apps/studio-web` and `apps/client-portal` are installable PWAs —
manifest, icons, splash screens, standalone mode, a real install
prompt, offline fallback, a cached app shell, push notifications,
background sync where the browser supports it, and update
notifications. Most of Studio Console's underlying PWA
infrastructure — a thorough hand-written service worker, the install/
update handshake, and a complete IndexedDB offline cache and write
queue — already existed and held up under review; what this pass
found and fixed were the gaps around it: neither app's root layout
actually linked its manifest or mounted its install/update provider,
two of the three offline-queued actions pointed at backend endpoints
that didn't exist (redirected to the real ones, or in one case — "add
notes" — a brand-new minimal, append-only, replay-safe `Note` model
built to give that action something real to queue against), push
notifications were an honestly-stubbed send wired up for real with the
`web-push` package and VAPID keys, and Client Portal had a manifest and
icons but no service worker at all until this pass gave it one. Offline
support itself follows the brief's central rule exactly: viewing
cached events, contacts, shot lists, and equipment checklists, adding
notes, completing checklist items, and saving lead drafts are queued
and replayed automatically — everything else (quotations, payments,
WhatsApp sends, album approvals) simply disables itself while offline
rather than claiming to guarantee something only the server can
authorize. See
[docs/progressive-web-app.md](docs/progressive-web-app.md).

## Security Hardening

A full audit-and-fix pass across the platform's security controls,
plus five new reference documents:
[Security Guide](docs/security-guide.md),
[Incident Response Guide](docs/incident-response-guide.md),
[Data Deletion Policy](docs/data-deletion-policy.md),
[Privacy Implementation Guide](docs/privacy-implementation-guide.md),
and [Backup Recovery Checklist](docs/backup-recovery-checklist.md).
Most of the checklist (password hashing, brute-force lockout, rate
limiting, secret and backup encryption, signed URLs, audit logs)
already existed and held up under review. What this pass found and
fixed were real, not theoretical, gaps: a genuine CORS
misconfiguration (`origin: true` combined with credentials — any
website could have made authenticated requests against this API from
a victim's browser) replaced with an explicit resolver that checks a
configured allowlist plus each studio's own verified custom domains; a
Content-Security-Policy registered with no actual directives, now
locked down to what this API genuinely serves; and CSRF protection
that didn't exist anywhere, now a real double-submit cookie mechanism
on the one cookie-authorized action in the platform. A new automated
tenant-isolation completeness test — parsing the real Prisma schema
and comparing it against the tenant-scoping allowlist — caught a
genuine, previously-unnoticed cross-tenant gap
(`EventProductPricing`, introduced several prompts earlier) on its
very first run, fixed immediately. Also added: suspicious-login
alerts (flagging a login only when neither IP nor device matches any
recent session, so a traveling user is never falsely flagged),
self-service personal data export and account deletion (a soft-delete
that scrubs identifying fields while preserving the audit trail and
financial records a studio has a legitimate ongoing need to retain),
and studio deletion carrying the identical Platform Admin approval
gate Prompt 41 built for encrypted backup and restore — the platform's
two most destructive action categories share one discipline. See the
Security Guide for the complete picture, including what's explicitly
still a stated gap rather than quietly assumed done.

## Worker and Job Queues

Background processing across all 14 queues named in the brief — real
BullMQ workers in `apps/worker`, a shared registry (`@bcp/queue`) that
`apps/api`'s producer side and the worker's consumer side both read
from so they can never drift on a queue's name or retry policy, and a
genuine feature set: exponential backoff, a real dead-letter queue (a
job's own status moves to `dead_letter` only once its queue's
configured attempts are exhausted, never left ambiguously "failed"),
idempotency (a stable key from a job's own natural identity, checked
before a duplicate `JobRecord` is ever created), cancellation,
progress mirrored onto both the live job and its persisted record, and
failure alerts fired once per job rather than on every noisy retry.
Real BullMQ + Redis infrastructure and two honest demonstration
workers already existed before this pass — one of them explicitly
said its own business logic wasn't built yet, "since this file exists
specifically to demonstrate the enforcement wiring." Built on that
foundation: seven queues (email, WhatsApp, image processing, PDF
generation, webhooks, notifications, retention cleanup, subscription
expiry) do genuinely real work end to end, not stubs; payment
reconciliation and face indexing are honestly scoped to what's
possible without live gateway/AWS credentials in this environment; and
import/export queue plumbing intentionally doesn't duplicate Prompt
41's heavier synchronous services across two separate deployables,
each file saying so directly. Along the way, this pass found and fixed
a real bug in the pre-existing platform-admin job-retry endpoint — it
only ever flipped a database status flag and never actually
re-enqueued the job, so a "retried" job would have sat queued forever
without running again. See
[docs/worker-and-job-queues.md](docs/worker-and-job-queues.md).

## Testing

A four-tier strategy: fast Vitest unit tests across every `@bcp/*`
package (the overwhelming majority of this platform's ~700+ tests,
accumulated across every prompt in this build), mocked API-level tests
in `apps/api` (new this pass — real route/service logic tested against
a mocked `@bcp/database`, not a live one), Testcontainers-backed
integration tests for what a mock can't faithfully stand in for (real
cross-tenant SQL rejection, real constraint enforcement), and
Playwright end-to-end/responsive tests (`e2e/`) across all 11 viewport
sizes named in the brief, run as separate projects so a failure
reports exactly which size broke. This pass closed two real,
previously-nonexistent gaps — `@bcp/payments` had zero tests despite a
load-bearing webhook-signature-verification function, and `apps/api`
had no pattern at all for testing route logic without a live database
— and found a genuine payment-webhook-route gap along the way
(`RazorpayProvider.createPaymentLink()` has no caller anywhere in the
API, and no endpoint exists to receive a gateway webhook at all),
named directly rather than built around under a testing prompt. The
Testcontainers and Playwright suites are real, reviewed, and — in the
Playwright config's case — already caught and fixed one genuine bug
(an object-spread ordering mistake that would have silently made every
one of the 11 viewport projects share the same default viewport,
defeating the entire point of the matrix) via `tsc --noEmit` alone,
without ever needing a browser to run. Neither suite has actually
executed end-to-end in this environment — no Docker daemon, no
downloadable browser binaries, no live dev server have been available
anywhere in this build — and that's stated plainly as "written and
ready," not quietly implied as "tested." See
[docs/testing-guide.md](docs/testing-guide.md) for the complete map of
which brief category lives where.

## Monitoring and Observability

Structured logs correlated by request/studio/user ID, per-service
health checks across all 8 services named in the brief, a platform
health dashboard, configurable alert rules that only fire on sustained
trouble (never a single blip) and auto-resolve, and a real public
status page (`apps/status-web`) — previously a literal placeholder
reading "Business features are built in a later phase," now a working
page polling live per-service status, 90-day uptime percentages, and
incident history. Health checks honestly distinguish what's actually
checkable — a real `SELECT 1` for the database, a real Redis `PING`, a
new `StorageClient.headBucket()` added specifically for this — from
services (AI provider, WhatsApp, payment provider) checked only as "are
the credentials present," since a live call to Claude or Razorpay on
every health cycle would burn real cost just to prove the platform is
up. The part carrying the most weight: "never log" (passwords, OTPs,
access tokens, payment secrets, sensitive photo URLs) is wired directly
into `@bcp/logger`'s root pino instance via its `redact` option — every
logger anywhere in this platform inherits the same protection
automatically, rather than depending on each service remembering to
redact locally. Two real bugs were caught before shipping: a first
draft of the request-logging plugin fought Fastify's own already-built-
in per-request logger instead of extending it, and the public status
endpoint's first draft ran live health checks (with real database
writes) on every anonymous page view rather than reading persisted
history. See
[docs/monitoring-and-observability.md](docs/monitoring-and-observability.md).

## Deployment

Real, applyable production infrastructure: GitHub Actions CI/CD
(`.github/workflows/`) with PR checks scoped to only the packages a
change actually affects, a Docker-backed job for the Testcontainers
integration suite, and a release pipeline that treats database
migration as its own gated step before any traffic shifts to a new
image; Kubernetes manifests (`k8s/`) for `api` and `worker` as
independently-scaled Deployments with real HPAs, an Ingress handling
SSL and custom-domain routing via cert-manager; and five complete
deployment guides (`docs/deployment-guides/`) — Vercel + Railway,
Vercel + AWS, full Docker VPS, Cloudflare + R2, and Kubernetes-ready —
each covering DNS, SSL, environment variables, database migration,
storage setup, queue setup, domain verification, monitoring, and
backup recovery in that target's own specific terms, not generic
boilerplate repeated five times. Three supporting docs go deeper on
what every guide touches but doesn't fully unpack: why rolling back a
migration is a genuinely different, harder problem than rolling back
an application deploy (Prisma has no built-in "migrate down," and this
platform is honest about that rather than implying a one-command
undo exists); the full secret inventory and why a missing credential
degrades honestly while a leaked one is the actual danger; and why
`api` and `worker` are deliberately separate scaling decisions, since
request volume and background-job load don't move together. This
prompt also corrected a stale early-project planning document that
had deferred CI/CD and multi-tenant routing "until business features
exist to deploy" — they now do, and both are real. See
[docs/deployment.md](docs/deployment.md) as the starting index.

## Documentation

`apps/docs-web` — previously another literal placeholder ("Business
features are built in a later phase," the same pattern this whole
build kept finding and finishing in later prompts) — is now a real
documentation site: 26 user- and operator-facing documents (every one
named in the brief), rendered from plain markdown through a shared
sidebar-navigated layout, covering everything from the Product
Overview and Architecture down to role-specific guides (Platform
Admin, Studio Owner, Team, Client), feature guides (Gallery, Enquiry
Form, Quotation, Billing), eight integration setup guides each with
real numbered steps (WhatsApp, Email, Payment, AWS Rekognition,
Storage, Custom Domain, Subscription, License), and reference material
(Backup and Restore, Security, API Documentation, Troubleshooting).
Deliberately distinct in register from the 52 engineering documents
this build already wrote across every prior prompt — those explain
*why* something was built a certain way for the next engineer; these
explain *how to actually use it* for a studio owner, a team member, a
client, or a platform operator, with screenshot placeholders marking
exactly where a real product screenshot belongs once one exists.

## Demo Data and Product Tour

A genuinely solid demo-studio foundation already existed before this
pass — the studio itself, branches, roles, a real subscription and
license. What was missing was the business data that makes it feel
real: leads spanning a full funnel, clients, packages, quotations,
bookings, events, invoices and payments in a realistic mixed-payment
spread, expenses tied to real events, equipment, galleries with real
AI photo-analysis results and an in-progress album selection, and a
working automation example — every category named in the brief, added
to `packages/database/prisma/seed.ts`'s existing foundation rather
than replacing it. Reports need no separate seeding, since they
compute from everything above. Demo data is explicitly gated —
`shouldSeedDemoBusinessData()` skips it entirely in production unless
`SEED_DEMO_DATA=true` is set, while the platform catalog and
subscription plans (real reference data, not demo content) always
seed regardless. Alongside it: a dependency-free 10-step interactive
product tour built directly into `apps/studio-web`, spotlighting real
`data-tour`-tagged elements across Dashboard, Leads, Quotations,
Events, Payments, Galleries, AI Face Search, Album Selection, Reports,
and Settings — with two named, honest compromises where a single
always-visible target page didn't exist for a given step. See
[docs/demo-data-and-product-tour.md](docs/demo-data-and-product-tour.md).

## Final Production Audit

The closing audit of this build: every workspace lint (58/58 clean),
typecheck, unit test, and production build actually run, not assumed.
Two critical, previously-latent bugs were found and fixed — `api` and
`worker`'s Dockerfiles pointed at `.js` output files when their actual
build produces `.mjs`, and all 7 Next.js apps' Dockerfiles used a
`next start` flag (`-C`) that doesn't exist, confirmed by running
`next start --help` directly rather than trusting the syntax looked
plausible. Between them, every containerized deployment path this
platform supports would have failed at the final step despite every
other check passing — exactly the class of bug that only surfaces by
tracing the real deployment path end to end. The fix for the Next.js
apps was tested directly: the replacement command was run against a
real production build and confirmed serving `HTTP 200` before being
applied across all 7 Dockerfiles. A second, high-severity finding — 6
of 9 apps had a `test` script that failed outright simply because no
test files exist yet — was also fixed, taking the full workspace test
suite from a hard failure to 52/52 passing. The complete report —
a review of all 27 named areas, completed/partial/missing modules,
security/performance/scalability risk assessments, browser
limitations, a deployment checklist, a launch checklist, and a
post-launch roadmap — lives in
[docs/final-production-audit.md](docs/final-production-audit.md).

## Marketing website

`apps/marketing-web` is the public marketing site — 18 pages (Home,
Features, AI Features, CRM, Photo Delivery, Gallery, Album Selection,
Pricing, Security, White Label, About, Contact, Book Demo, Login,
Register, Privacy Policy, Terms, Refund Policy) with its own "darkroom /
contact sheet" visual identity distinct from the product's tenant-
brandable theme, SEO metadata and JSON-LD structured data on every page,
a plan comparison table generated from `@bcp/billing`'s real plan data
(never a second set of marketing-only numbers), Contact/Book Demo lead
capture backed by a validated, honeypot-protected API route that emails
the sales inbox, and a consent-gated analytics loader that doesn't run
anything until a visitor explicitly opts in. See
[docs/marketing-site.md](docs/marketing-site.md).

## Design system

Every app shares one responsive design system (`@bcp/ui`) covering 6
breakpoint tiers (320px small mobile → 1440px+ large desktop), a full
navigation shell (desktop sidebar / tablet rail / mobile bottom nav), data
display, forms, overlays, and system states — built to WCAG 2.2 AA with
44px touch targets, safe-area support, and reduced-motion handling
throughout. Preview every component:

```bash
pnpm storybook   # http://localhost:6006
```

See [packages/ui/README.md](packages/ui/README.md) for the full component
list and [docs/navigation.md](docs/navigation.md) /
[docs/accessibility.md](docs/accessibility.md) for the behavioral spec.


## Tooling

| Concern | Tool |
|---|---|
| Package manager / workspaces | pnpm workspaces |
| Task orchestration & caching | Turborepo |
| Language | TypeScript (strict mode) |
| Lint / format | ESLint + Prettier (+ prettier-plugin-tailwindcss) |
| Git hooks | Husky + lint-staged + commitlint |
| Styling | Tailwind CSS (shared preset) + shadcn/ui |
| Database | PostgreSQL + Prisma |
| Cache / queues | Redis + BullMQ |
| Object storage | MinIO (local) / S3-compatible (prod) |
| Email (dev) | Mailpit |
| Containers | Docker + Docker Compose |

## Local infrastructure ports

| Service | Port | Notes |
|---|---|---|
| PostgreSQL | 5432 | user `bcp` / db `bcp_studio_os` |
| Redis | 6379 | |
| MinIO API | 9000 | S3-compatible |
| MinIO Console | 9001 | http://localhost:9001 |
| Mailpit SMTP | 1025 | |
| Mailpit Web UI | 8025 | http://localhost:8025 |

## Apps & default dev ports

| App | Port |
|---|---|
| marketing-web | 3000 |
| platform-admin | 3001 |
| studio-web | 3002 |
| client-portal | 3003 |
| gallery-web | 3004 |
| docs-web | 3005 |
| status-web | 3006 |
| api | 4000 |
| worker | — (background process) |

## License

Proprietary — internal project for Balloon Connect Photography / BCP Studio OS.
