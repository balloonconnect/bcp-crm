# Marketing website

`apps/marketing-web` is the public marketing site for BCP Studio OS —
18 pages, its own visual identity, SEO metadata and structured data,
lead-capture forms, and a plan comparison table built from the product's
real billing data.

## Design system: "darkroom / contact sheet"

The marketing site deliberately does **not** use the product's
tenant-brandable CSS-variable palette (`packages/branding`) — there's no
tenant here, just BCP Studio OS's own identity. Instead it layers a fixed
palette on top of the shared Tailwind preset (still used for spacing,
breakpoints, and the type scale):

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1C1917` | Darkroom background — hero, alternating dark sections |
| `charcoal` | `#292524` | Card/panel background on dark sections |
| `paper` | `#F7F3EC` | Contact-sheet paper — light section background |
| `paper-dim` | `#EDE7DA` | Recessed panel on paper sections |
| `safelight` | `#E8A33D` | The one warm accent — a literal darkroom safelight color |
| `signal` | `#2DD4BF` | Reserved for small "live" indicators only, not a competing accent |

Type is a warm editorial serif for display (`Charter`/`Georgia`/system
stack — no Google Fonts network dependency, since the build sandbox has
no access to fonts.gstatic.com) paired with a standard system sans for
body copy and a monospace face for the site's structural device: small
"exposure tag" labels (e.g. `F/2.8 · PIPELINE`) styled after camera EXIF
data, used consistently on every feature card.

The signature element is a literal **contact sheet**: the home page hero
renders the 6 most prominent key sections as numbered film-frame tiles
(`ContactSheetGrid`), and every feature card across every page
(`FrameCard`) carries a sprocket-hole edge and a frame number, so the
motif reads as one system rather than a one-off hero decoration. See
`src/components/marketing/` for the implementation.

## Pages (18)

Home, Features, AI Features, CRM, Photo Delivery, Gallery, Album
Selection, Pricing, Security, White Label, About, Contact, Book Demo,
Login, Register, Privacy Policy, Terms, Refund Policy — one route per
page under `src/app/`.

`Login` and `Register` are intentionally thin: login is tenant-scoped by
design (`apps/api`'s `/auth/login` resolves `studioId` from the request's
verified hostname — see `docs/authentication.md`), so there's no single
global login form to embed on a shared marketing domain. The Login page
instead asks for a studio's address and redirects there, mirroring the
"find your workspace" pattern other multi-tenant products use. Register
links straight into `apps/studio-web`'s onboarding wizard
(`packages/onboarding/docs/onboarding.md`), which is the platform's real
sign-up flow.

## Content is centralized

`src/lib/content.ts` is the single source of truth for the 11 key
sections named in the product brief, navigation, FAQs, and testimonial
placeholders — every page pulls from it rather than restating feature
names or descriptions independently, so copy can't drift between pages
that reference the same feature. `src/lib/plans-content.ts` derives the
pricing page's plan cards and comparison table directly from
`@bcp/billing`'s `PLAN_DEFINITIONS`, so marketing pricing can never show
different numbers than what the product actually enforces.

Testimonials are explicit, labeled placeholders (`TESTIMONIAL_PLACEHOLDERS`
in `content.ts`) — not fabricated quotes — each documenting what kind of
studio the slot is reserved for, ready to be filled with real quotes
later.

## SEO & structured data

`src/lib/seo.ts` centralizes metadata generation (`buildMetadata()` —
title template, canonical URL, Open Graph/Twitter tags) and JSON-LD
builders for `Organization`, `SoftwareApplication`, `FAQPage`, and
`BreadcrumbList` schemas, rendered via the `JsonLd` component. Every page
sets its own `metadata` export and includes a breadcrumb; the pricing
page additionally emits `FAQPage` structured data for its pricing FAQs.

## Lead capture

The Contact and Book Demo pages share one form component
(`components/marketing/lead-form.tsx`) submitting to
`app/api/leads/route.ts`, a Next.js Route Handler that validates input
with zod, rejects obvious bots via a honeypot field, and emails the
sales inbox through the shared `@bcp/email` client (same SMTP/Mailpit
setup every other app in the monorepo uses — see `.env.example`).

No CRM `Lead` model exists yet in this phase (the same reasoning as
`packages/onboarding/docs/onboarding.md`'s note on the `Client` model) —
this is intentionally a notification pipeline, not a stored pipeline.
Wiring it into a real Leads module is a later phase once that CRM
surface exists.

## Analytics consent

`components/layout/cookie-consent.tsx` gates
`components/layout/analytics.tsx` — no analytics script loads until a
visitor explicitly clicks "Allow analytics"; the choice persists in
`localStorage` and dismissing/declining never shows the banner again on
return visits. No analytics provider is wired by default
(`NEXT_PUBLIC_ANALYTICS_ID` is empty in `.env.example`); the loader is a
placeholder `<script>` tag ready to point at a real provider once one is
chosen.

## Testing

```bash
pnpm --filter @bcp/marketing-web test        # content/SEO/pricing logic
pnpm --filter @bcp/marketing-web typecheck
pnpm --filter @bcp/marketing-web lint
pnpm --filter @bcp/marketing-web build        # verifies all 18 pages + the API route compile and prerender
```
