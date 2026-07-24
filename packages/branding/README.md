# @bcp/branding

White-label branding engine: theme resolution (platform default → studio
→ branch), CSS variable generation, WCAG contrast validation, version
history + rollback, theme caching, asset validation, and per-surface
application (email, invoice/receipt, gallery, client portal, watermark,
public forms).

See [docs/branding.md](./docs/branding.md) for the full design writeup —
the 26-field mapping, resolution model, why email doesn't use CSS
variables, the contrast-warnings-are-non-blocking decision, and the
version-history/rollback semantics.

## Structure

```
src/
  theme-schema.ts       zod schema + types for the full BrandTheme shape
  platform-default.ts   PLATFORM_DEFAULT_THEME — matches @bcp/ui exactly
  resolve-theme.ts       platform → studio → branch merge, with source tracking
  colors.ts               hex/HSL conversion, WCAG luminance
  css-variables.ts         BrandTheme -> CSS custom properties (@bcp/ui-compatible names)
  contrast.ts               WCAG contrast ratio + theme-wide validation
  cache.ts                   ThemeCache interface + InMemoryThemeCache
  versioning.ts               snapshot / diff / rollback (pure logic)
  asset-storage.ts             validation + storage-key convention for uploads
  apply/
    email.ts                    branded email header/footer wrapper
    invoice.ts                    invoice + receipt design token resolution
    watermark.ts                   gallery/album watermark config
    gallery.ts                      gallery + album viewer theme override
    client-portal.ts                 client portal theme override
    public-form.ts                    trimmed theme for public lead forms
  client/
    theme-provider.tsx                 <BrandThemeProvider>, useBrandTheme()
    theme-preview.tsx                    <ThemePreview> with device toggle
```

## Quick start

```ts
import { resolveTheme, themeToCssVariables } from "@bcp/branding";

const { theme } = resolveTheme({ studioOverride, branchOverride });
const cssVars = themeToCssVariables(theme);
```

```tsx
import { BrandThemeProvider } from "@bcp/branding/client";

<BrandThemeProvider theme={resolvedTheme}>
  <App />
</BrandThemeProvider>;
```

The HTTP surface (`GET`/`PATCH /branding/theme`, versions, rollback,
branch overrides, asset upload, and the public `GET /public/branding`
endpoint) lives in `apps/api/src/services/branding.service.ts` and
`apps/api/src/routes/branding.routes.ts`.
