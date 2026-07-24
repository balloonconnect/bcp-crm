# @bcp/ui — BCP Studio OS Design System

Shared, white-label-aware React component library used by every app in the
monorepo. This package owns:

- **Breakpoint tokens** (`src/tokens/breakpoints.ts`) and the matching
  Tailwind `screens` override (`packages/config/tailwind/preset.ts`)
- **Base shadcn-style primitives** (Button, Card, Dialog, Sheet, Dropdown
  Menu, Tooltip, Avatar, Badge, Input, ScrollArea, Separator)
- **The responsive design system** — 22 components covering app shell
  navigation, overlays, data display, forms, and system states
- **A Storybook instance** as the living component preview / documentation

## Breakpoints

Mobile-first, six tiers:

| Tailwind prefix | Min-width | Range | Tier |
|---|---|---|---|
| _(none)_ | 0px | 320–374px | Small mobile |
| `xs:` | 375px | 375–639px | Standard mobile |
| `sm:` | 640px | 640–767px | Tablet portrait |
| `md:` | 768px | 768–1023px | Tablet landscape |
| `lg:` | 1024px | 1024–1439px | Desktop |
| `xl:` | 1440px | 1440px+ | Large desktop |

Prefer Tailwind responsive classes for layout. Reach for the JS hooks
(`useIsBreakpoint`, `useDeviceClass` in `src/hooks/use-breakpoint.ts`) only
when a decision can't be expressed in CSS — e.g. choosing which whole
component tree to mount (`ResponsiveDataView` picking `ResponsiveTable` vs.
`ResponsiveCardList`).

## Navigation behavior

See [`docs/navigation.md`](../../docs/navigation.md) at the repo root for
the full rationale. Summary:

- **Desktop (lg+)** — `DesktopSidebar` (collapsible, with studio/branch
  switcher) + a top bar for global search, quick-create, and notifications.
- **Tablet (sm–md)** — `TabletNavigation`, a fixed compact icon rail; a
  drawer (triggered from the rail) surfaces studio switching and secondary
  nav. Content reflows into the remaining width rather than becoming a
  mobile layout.
- **Mobile (below sm)** — `MobileHeader` (56px, safe-area aware) + a fixed
  `MobileBottomNavigation` with exactly 5 slots: **Home, Leads, Events,
  Payments, More**. "More" and the header's menu icon both open the
  slide-out secondary menu. Search opens full-screen.

`ResponsiveAppShell` composes all three patterns — exactly one is mounted
per breakpoint, so there's no duplicate chrome in the accessibility tree.

## Accessibility

See [`docs/accessibility.md`](../../docs/accessibility.md) for the full
checklist this library is built against (WCAG 2.2 AA target). Highlights:

- Every interactive control is ≥44×44px (`min-h-touch-target` /
  `min-w-touch-target` utilities), except a documented, intentional `sm`
  Button exception for dense desktop contexts.
- No functionality is hover-only — tooltips are supplementary, never the
  only way to discover a control's purpose.
- Visible focus ring on every focusable element (`:focus-visible` in
  `src/styles/globals.css`), not just default browser outlines.
- `prefers-reduced-motion: reduce` is respected globally, plus
  `usePrefersReducedMotion()` for JS-driven transitions.
- Safe-area insets (`pt-safe`, `pb-safe`, …) keep chrome clear of notches
  and home indicators.
- No component introduces *essential* horizontal scrolling — `ResponsiveTable`
  hides columns instead of scrolling, `ResponsiveDataView` switches to
  `ResponsiveCardList` below `md`. The one intentional exception
  (`ResponsiveFilterBar`'s quick-filter chip row) is optional, duplicate
  content also reachable through the "Filters" sheet.

## Theming

Colors are CSS custom properties (`src/styles/globals.css`), not hardcoded
Tailwind colors, so a tenant's brand (via `@bcp/branding`) can override
`--primary` / `--brand` / etc. at runtime without a rebuild. Both a `:root`
(light) and `.dark` token set are defined; toggle with the `dark` class on
`<html>` or a wrapping element.

## Storybook

```bash
pnpm storybook          # dev server at http://localhost:6006
pnpm build-storybook    # static build → packages/ui/storybook-static
```

Every one of the 22 responsive components has at least one story. The
toolbar has two custom controls beyond the standard Storybook set:

- **Theme** — toggles light/dark by adding/removing the `.dark` class
- **Reduced motion** — flags the story for manual motion-preference review

The **Viewport** addon is pre-configured with six presets named after the
exact breakpoint tiers above (Small mobile, Standard mobile, Tablet
portrait, Tablet landscape, Desktop, Large desktop), and the **a11y**
addon runs `axe-core` against every story on the WCAG 2.1 A/AA + 2.2 AA
rule sets.
