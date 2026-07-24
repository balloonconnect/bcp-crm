# Privacy Implementation Guide

How this platform's privacy-relevant capabilities are actually
implemented, for anyone who needs to explain, audit, or extend them.

## The three kinds of "export" in this platform, and why they're separate

1. **Personal data export** (`GET /account/export`, Prompt 43) — one
   individual's own data: their profile, login sessions, audit trail
   entries, assigned tasks, and notes they wrote. This is the "right
   to access" export — scoped narrowly to what identifies or was
   created by that specific person.
2. **Studio business data export** (Prompt 41, `apps/studio-web`'s
   `/data-tools`) — a studio's own operational data (leads, clients,
   bookings, events, payments, expenses, galleries, albums, audit
   logs, or everything via `complete_studio_data`). This is business
   data a studio owns and needs for its own operations, backup, or
   migration — not a privacy mechanism for an individual.
3. **Encrypted full-studio backup** (Prompt 41) — an operational
   disaster-recovery artifact, encrypted at rest, gated behind
   Platform Admin approval. Not intended for a studio to read or parse
   directly; see the Backup Recovery Checklist.

Keeping these three genuinely separate — rather than one "export
everything" button wearing three different hats — is what lets each
one have the right access control and the right shape: an individual
can always get their own personal export without needing studio-admin
permissions; a studio's business export requires studio-management
permission; a full encrypted backup requires platform-level approval.

## Tenant isolation as a privacy control

Cross-tenant data exposure is a privacy incident, not just a
correctness bug — one studio's clients' personal information leaking
to another studio is exactly the kind of failure privacy regulation
exists to prevent. This platform's tenant isolation
(`packages/database`'s `createTenantClient`, documented fully in
[docs/tenant-isolation.md](../packages/database/docs/tenant-isolation.md))
is the primary technical control against that, layered with route-level
auth checks and an automated schema-completeness test that fails the
build if any model with its own `studioId` isn't registered for
scoping — the same test that caught a real, previously-unnoticed gap
(`EventProductPricing`) during this platform's own Prompt 43 hardening
pass.

## Data minimization in AI-adjacent features

Several features send data to Claude (the AI Studio Copilot, the AI
Marketing Studio, photo intelligence, natural-language search). Every
one of them was built with the same discipline: the model never
receives a `studioId` it could redirect elsewhere (the AI Studio
Copilot's tools structurally cannot accept one as a parameter — see
[docs/ai-studio-copilot.md](ai-studio-copilot.md)), and each feature
sends only the specific fields relevant to its task, not a broad dump
of a client's or lead's full record.

## Consent and disclosure surfaces

- **Face recognition** (Prompt 28) requires explicit client consent,
  logged in an append-only `FaceConsentLog`, before any face-matching
  search runs — consent is recorded independent of whether the search
  ultimately succeeds.
- **Cookie use** is limited to authentication (httpOnly refresh token,
  non-httpOnly CSRF token) — no tracking or analytics cookies exist in
  this codebase.

## What a studio's clients should be told

A studio operating on this platform is the data controller for its
own clients' information; this platplatform is the processor. A
studio should disclose to its own clients, in whatever privacy notice
it presents them:

- What's collected (contact details, event details, photos, payment
  records).
- That photos may be processed by AI features (face search, photo
  quality analysis) if the studio has those enabled, and that face
  search specifically requires the client's own consent before it
  runs.
- How long data is retained and how a client can request access to or
  deletion of their own data from the studio (which the studio
  fulfills using this platform's export/deletion capabilities on the
  client's behalf, since a client doesn't have direct platform login
  access the way a studio user does).

## Known gap

There is currently no dedicated client-facing "export my data" or
"delete my data" self-service capability in the Client Portal itself —
a client's data-subject requests are fulfilled by the studio (their
data controller) using the studio-side tools, not directly by the
client. Building a client-portal-native version of these two
capabilities is a reasonable next step, not yet done.
