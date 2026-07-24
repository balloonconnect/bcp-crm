# White-Label Branding Engine

How BCP Studio OS lets every studio look like their own product, not a
reskinned version of ours. Implementation lives in `@bcp/branding` (pure
theme logic + React), `@bcp/database`'s `StudioBrand`/`BranchBrand`/
`StudioBrandVersion` models, and `apps/api/src/services/branding.service.ts`
(the HTTP surface).

## The 26 branding fields

| Field | Where |
|---|---|
| Studio name | `Studio.name` (legal/system record) + `StudioBrand.displayName` (customer-facing override) |
| Legal business name | `StudioBrand.legalBusinessName` |
| Logo | `logoUrl` |
| Light logo | `logoLightUrl` (for dark backgrounds) |
| Dark logo | `logoDarkUrl` (for light backgrounds) |
| Favicon | `faviconUrl` |
| Primary color | `primaryColor` |
| Secondary color | `secondaryColor` |
| Accent color | `accentColor` |
| Background color | `backgroundColor` |
| Text color | `textColor` |
| Typography | `fontFamilyBody`, `fontFamilyHeading` |
| Border radius | `borderRadius` (px) |
| Button style | `buttonStyle` (solid / outline / ghost / pill) |
| Card style | `cardStyle` (flat / elevated / bordered) |
| Login background | `loginBackgroundUrl` |
| Email header | `emailHeaderImageUrl` / `emailHeaderHtml` |
| Email footer | `emailFooterHtml` |
| Invoice design | `invoiceDesign` (JSON: accent override, logo/watermark toggles, number format) |
| Watermark | `watermarkUrl`, `watermarkOpacity`, `watermarkPosition` |
| Gallery theme | `galleryTheme` (JSON override) |
| Client portal theme | `clientPortalTheme` (JSON override) |
| Copyright text | `copyrightText` |
| Support email | `supportEmail` |
| WhatsApp number | `whatsappNumber` (+ `whatsappDisplayName`) |
| Social links | `socialLinks` (JSON array of `{ platform, url }`) |
| Powered-by visibility | `poweredByVisible` |

Why some are typed columns and some are JSON: see
`packages/database/docs/database-conventions.md` § "JSON columns" — the
short version is that well-defined, individually-queryable tokens (colors,
typography, the identity fields) are real columns, and things that are
inherently a small bag of related settings for one surface (invoice
design, per-surface theme deltas, the social links list) are JSON.

## Resolution: platform default → studio → branch

```
PLATFORM_DEFAULT_THEME  (packages/branding/src/platform-default.ts)
        |
        v  merged with, field by field
  StudioBrand row        (packages/database - one per studio)
        |
        v  merged with, field by field
  BranchBrand.overrides   (packages/database - one per branch, optional)
        |
        v
  effective BrandTheme
```

`resolveTheme()` (`packages/branding/src/resolve-theme.ts`) implements
this as a pure function: each layer only supplies the fields it actually
sets (`undefined` fields fall through), and later layers win on conflict.
A brand-new studio with no `StudioBrand` row yet still resolves to a
complete, valid theme — the platform default — so there's never a
"broken" unbranded state. The function also returns a `sources` map
(`{ primaryColor: "studio", loginBackgroundUrl: "branch", ... }`) so a
theme editor UI can show "this is customized at the branch level" badges
per field.

## CSS variable generation

`themeToCssVariables()` (`packages/branding/src/css-variables.ts`)
produces the **same variable names** `@bcp/ui`'s whole design system reads
— `--primary`, `--accent`, `--background`, `--foreground`, `--radius`,
`--font-sans`, `--font-display` (see
`packages/ui/src/styles/globals.css`). This is the load-bearing design
decision that makes white-labeling *not* require touching every
component: every Button, Card, and layout primitive in `@bcp/ui` already
renders from these variables, so injecting a studio's resolved theme via
`<BrandThemeProvider>` (`packages/branding/src/client/theme-provider.tsx`)
re-themes the entire product surface with zero per-component branding
code.

Colors are converted from the hex strings stored in the database to HSL
triplets (`"222 24% 12%"`) because that's the format `@bcp/ui`'s CSS
expects (`hsl(var(--primary))` — see `colors.ts`). Every `*-foreground`
pair (`--primary-foreground`, `--accent-foreground`, …) is computed
automatically via `readableForegroundFor()` — picking black or white,
whichever contrasts better — so a studio that only sets `primaryColor`
never ends up with illegible button text.

### Why email doesn't use CSS variables

`apply/email.ts`'s `wrapEmailWithBrand()` inlines every color as a literal
hex value instead of `var(--x)`. Email clients (Outlook in particular)
have unreliable-to-nonexistent support for CSS custom properties, so the
one surface where the CSS-variable approach breaks down gets its own
direct-value rendering path instead.

## Contrast validation

`validateThemeContrast()` (`packages/branding/src/contrast.ts`) checks
the pairs that actually get rendered together — body text on background
(needs the WCAG AA text threshold, 4.5:1) and each brand color against
the background as a UI-component-level check (3:1, the relaxed threshold
for non-text elements). This runs on every `PATCH /branding/theme` call
(`apps/api/src/services/branding.service.ts`) and returns `contrastWarnings`
in the response — **non-blocking**. A studio can save a theme that fails
contrast checks; the save succeeds and the warnings are surfaced in the
UI as a "this may be hard to read" nudge, not a hard stop. Blocking saves
outright would take away legitimate creative control (a studio might
deliberately want a low-contrast, moody dark theme for a specific gallery)
in exchange for a guardrail that's better served as guidance.

## Theme version history & rollback

Every `PATCH /branding/theme` call — including a rollback itself — writes
a new `StudioBrandVersion` row (`{ studioId, version, snapshot, note,
createdBy }`) via `nextVersionNumber()` and `buildSnapshot()`
(`packages/branding/src/versioning.ts`). History is **append-only**:
`rollbackToVersion()` doesn't delete or rewrite anything — it applies a
past version's snapshot as the new current `StudioBrand` state, which
itself gets recorded as the next version (e.g. rolling back from v5 to v3
creates v6, containing v3's values). This means the version list always
reads as a true chronological history of what happened, including
rollbacks, rather than a mutable pointer.

`diffThemes()` computes a field-level diff between any two snapshots —
used to show "what changed in version 4" without the caller needing to
manually compare two JSON blobs.

## Theme caching

`ThemeCache` (`packages/branding/src/cache.ts`) is a small interface
(`get`/`set`/`invalidate`/`invalidatePrefix`) with an `InMemoryThemeCache`
default implementation, keyed by `studio:<id>` or
`studio:<id>:branch:<id>`. `branding.service.ts` uses one process-local
instance with a 5-minute TTL, invalidated immediately on any theme update
(`invalidatePrefix` clears the studio's key and every branch-scoped key
under it in one call, since a studio-level change can affect what a
branch resolves to even without the branch's own override changing).

**Production note:** the in-memory implementation is fine for a single
API instance or local dev. Running multiple API instances needs a shared
cache — implement `ThemeCache` against `ioredis` (already a dependency in
`apps/worker`, and `REDIS_URL` is already in the shared env schema) and
swap the one `new InMemoryThemeCache()` call in `branding.service.ts`;
nothing else changes, since every caller only depends on the interface.

## Real-time preview + mobile/tablet/desktop preview

`<ThemePreview>` (`packages/branding/src/client/theme-preview.tsx`) takes
`theme` as a **controlled prop**, not internal state — a theme editor
passes updated form values straight through on every change (a color
picked, a font selected), and the preview re-renders immediately with no
separate "apply" step. That's what makes it "real-time": there's no
draft/publish distinction in the preview layer itself (only in what
actually gets persisted via `PATCH /branding/theme`).

The device toggle switches between three fixed widths chosen to sit
mid-range within `@bcp/ui`'s six-tier breakpoint scale (see
`packages/ui/src/tokens/breakpoints.ts` and
`docs/navigation.md`/`docs/accessibility.md` from the design-system
phase) — 390px (standard mobile), 820px (tablet landscape), 1280px
(desktop) — so what the preview shows matches what the real product looks
like at those widths, not an arbitrary guess.

## Asset storage

`validateBrandAsset()` and `brandAssetStorageKey()`
(`packages/branding/src/asset-storage.ts`) define per-asset-kind size/type
limits (logos and favicons stay small since they render at icon/header
size; login backgrounds and email header images allow more room) and a
storage key convention: `branding/{studioId}/{kind}/{timestamp}.{ext}`.
The timestamp (not a fixed filename) means replacing a logo doesn't
invalidate anything still pointing at the old URL — a cached page, an
already-sent email — until the theme is next resolved and picks up the
new URL. `apps/api`'s `uploadBrandAsset()` uses `@bcp/storage`'s
`StorageClient` (S3/MinIO) to actually store the bytes and returns a URL;
old objects are expected to be cleaned up by a periodic job (not built in
this phase), not deleted synchronously on replace.

## Applying branding to every surface

| Surface | Function | Notes |
|---|---|---|
| Studio CRM | `<BrandThemeProvider>` directly | Full theme, every field |
| Client Portal | `resolveClientPortalTheme()` | Studio theme + `clientPortalTheme` JSON override |
| Gallery | `resolveGalleryTheme()` | Studio theme + `galleryTheme` JSON override |
| Album viewer | `resolveAlbumViewerTheme()` | Alias of `resolveGalleryTheme` — same public surface |
| Quotation | `resolveInvoiceDesign()` | Shares the invoice design surface (accent, logo, footer note) |
| Invoice | `resolveInvoiceDesign()` | Accent override, logo/watermark toggles, number format |
| Receipt | `resolveReceiptDesign()` | Alias of `resolveInvoiceDesign` |
| Email | `wrapEmailWithBrand()` | Inlined styles (see above), header/footer, social links, powered-by line |
| Public forms | `resolvePublicFormTheme()` | Trimmed to identity + color tokens only — never internal fields like `invoiceDesign` |
| Watermark (on gallery/album images) | `resolveWatermarkConfig()` | `enabled` is `false` whenever `watermarkUrl` is unset — no default BCP Studio OS watermark is ever stamped on a studio's photos |

Every `apply/*.ts` function takes a fully-resolved `BrandTheme` (the
output of `resolveTheme()`) — the "apply" step is purely about narrowing
or re-merging that theme for a specific surface's needs, never a second
independent resolution path.

## API surface

- `GET /branding/theme`, `PATCH /branding/theme` — authenticated,
  `studio:manage` permission required. Studio's own theme.
- `GET /branding/versions`, `POST /branding/versions/rollback` —
  version history and rollback.
- `PATCH /branding/branches/:branchId`, `GET /branding/branches/:branchId/theme`
  — branch-level override management and resolution.
- `POST /branding/assets?kind=logo` — multipart file upload, returns a URL.
- `GET /public/branding?studioSlug=...` — **unauthenticated**. Studio is
  resolved the same pre-auth way login resolves it (verified hostname or
  an explicit slug — see `docs/authentication.md` § "Studio resolution
  before login"), because branding is meant to be publicly visible on the
  gallery/portal/public-form surfaces that call this. This is a
  deliberate, narrow exception to "never trust studioId from the
  browser" — it's a read-only, non-sensitive resolution, not the tenant
  data isolation boundary that applies everywhere else (see
  `packages/database/docs/tenant-isolation.md`).
