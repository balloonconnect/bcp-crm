# Public enquiry form

A studio-configurable public lead-capture form — built across
`@bcp/enquiry-form` (field config, validation, spam heuristics, UTM
parsing, link/embed builders), `apps/api` (studio-side CRUD + a fully
public, rate-limited submission pipeline), `apps/studio-web` (the form
builder and share-assets UI), and `apps/client-portal` (the actual
public-facing page, since it already exists as a tenant-branded
public-facing app — see "Which app serves it" below).

## Data model

Two new models: `EnquiryForm` (the configuration — title, description,
cover image, field visibility, event types, contact methods, consent/
terms, success message, auto-response, default assignment, active flag)
and `EnquiryFormSubmission` (one row per public submission, kept
deliberately distinct from the `Lead` it creates — see the schema's
inline comment for why: it carries marketing attribution, consent
proof, and spam signals that don't belong on the CRM record, and it can
exist even for a rejected/spam submission, which is useful for tuning
spam protection later).

## Which app serves the public page

`apps/client-portal` was already scoped as a tenant-branded public-
facing app (resolves a studio's branding, no auth) — the enquiry form
lives there at `/enquire/[studioSlug]/[formSlug]` rather than in a new
app. It applies the studio's brand theme via `@bcp/branding`'s existing
`themeToCssVariables()` (the same helper the gallery and client-portal
theme appliers already use) as CSS custom properties on the page
wrapper, so the form genuinely looks like the studio's own page, not
BCP Studio OS's.

## Public link, embed, QR

The public URL is resolved by `(studioSlug, formSlug)` — the same
hostname-independent pattern `/public/branding` already uses (see
`resolve-studio-for-auth.ts`), so the link works whether or not a
studio has a custom domain configured yet. A studio *can* still point a
custom domain at it later via the `enquiry_form` `StudioDomain` purpose
that's existed since the custom-domains phase — this phase makes that
purpose's target page exist for the first time, but doesn't add new
per-domain routing logic beyond what already resolves `client_portal`/
`gallery` domains.

- **Embed code**: a plain `<iframe>` snippet. Deliberately not a custom
  JS widget SDK — an iframe is simpler, works everywhere, and needs no
  script to be trusted and loaded by a third-party site.
- **QR code**: generated server-side with the `qrcode` package as a PNG
  data URI (`GET /enquiry-forms/:id/share`), downloadable directly from
  the share dialog.

## Submission pipeline

`POST /public/enquiry-forms/:formSlug/submit` (fully public, no auth):

1. Resolve the studio + form (404 if inactive or not found — an
   inactive form isn't distinguishable from a nonexistent one).
2. Validate the payload against *that form's* configured required
   fields and consent requirement (`validateSubmissionPayload`).
3. Spam check (`checkForSpam`): a filled honeypot, an implausibly fast
   fill time, or high submission velocity from one IP — any one is
   enough to flag. This is layered under a **hard rate limit**
   (`@fastify/rate-limit`, same plugin/pattern as the auth phase's login
   rate limits) capping submissions per IP per hour — the limit stops
   abuse outright; the heuristic still flags submissions that get
   through it for review rather than trusting them blindly.
4. Duplicate check — reuses `@bcp/leads`'s `findDuplicates()` (same
   normalized phone/email/Instagram matching the lead-management create
   form uses), recorded on the submission but never blocking it.
5. A spam-flagged submission is recorded but does **not** create a
   `Lead` or send any notification — everything else does.
6. Create the `Lead` (source inferred from UTM when present, otherwise
   `website`; assigned to the form's configured default salesperson).
7. Record the `EnquiryFormSubmission` — UTM (all 5 standard params),
   referrer, IP/user agent, consent given + a snapshot of the exact
   consent text agreed to (compliance-relevant: the text can change
   later, the snapshot can't).
8. Notifications: the studio's owners/admins, the assigned salesperson
   (if set and different), and — if `autoResponseEnabled` and an email
   was given — a confirmation to the enquirer. Each is sent
   independently; one failing (e.g. a bad address) doesn't fail the
   submission itself.

## Known simplifications

- Spam protection is heuristic, not a third-party CAPTCHA/anti-abuse
  service — a real integration is better tuned against actual spam
  volume once there is some, not built speculatively now.
- "Notify studio" means the studio's `owner`/`admin` role holders, not
  a separately configurable notification address — a dedicated
  "notifications" setting is a reasonable future addition once a studio
  actually wants those to differ.
- Configurable fields are a fixed subset of `Lead`'s fields (see
  `@bcp/enquiry-form`'s `CONFIGURABLE_FIELD_KEYS`) — internal CRM-only
  fields (`assignedTo`, `priority`, `winProbability`, `lostReason`)
  aren't offered at all, not just hidden by default, since a public
  enquirer has no reason to ever set them.

## New permissions

`enquiry_form:manage` / `enquiry_form:view` were added to
`@bcp/permissions`' catalog and granted to `owner` (via the "all
permissions" set), `admin`, `manager`, and `sales` roles. Note this only
affects the role catalog *definition* — studios already provisioned
before this change won't automatically gain the new permission on their
existing roles without a role-sync step, the same caveat that applies
to any RBAC catalog addition.

## Testing

```bash
pnpm --filter @bcp/enquiry-form test    # field config, validation, spam, UTM, links
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/client-portal build  # verifies the public form page compiles
pnpm --filter @bcp/studio-web build     # verifies the builder UI compiles
```
