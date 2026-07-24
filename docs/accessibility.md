# Accessibility

BCP Studio OS targets **WCAG 2.2 Level AA** across every app. This document
is the checklist `@bcp/ui` components are built and reviewed against —
both when adding a new component and when reviewing a story in Storybook's
a11y addon.

## Touch targets — minimum 44×44px

Every interactive element (links, buttons, form controls, nav items) has a
minimum hit area of 44×44 CSS px, via the `min-h-touch-target` /
`min-w-touch-target` / `h-touch-target` / `w-touch-target` Tailwind
utilities (defined in `packages/config/tailwind/preset.ts` from
`MIN_TOUCH_TARGET` in `packages/ui/src/tokens/metrics.ts`).

**Documented exception:** `Button`'s `sm` size (40px) is for dense,
mouse-oriented contexts — e.g. an inline "View" action in a desktop table
row — per WCAG 2.5.8's exception for controls that are one of several
equivalent ways to trigger the same action, or are essentially inline text.
It is never used as the sole control for a primary action, and never
appears in a touch-primary context (mobile card actions use the default
44px size).

## No hover-only actions

Every action reachable by hover is also reachable by focus (keyboard) and
by tap (touch, which has no hover state at all). Concretely:

- `Tooltip` is supplementary only — the trigger it annotates (e.g. a
  collapsed `DesktopSidebar` icon) is a real link/button with an
  `aria-label`, not a hover-revealed control.
- Row actions in `ResponsiveTable` / `ResponsiveCardList` render as visible
  buttons, not a hover-reveal overlay.
- `DesktopSidebar`'s collapse toggle, studio switcher, and nav items are
  all focusable, `:focus-visible`-ringed elements — collapsing to
  icon-only still keeps every item in the tab order with an accessible
  name via `aria-label` or the tooltip's accessible pairing.

## Keyboard navigation

- All overlays (`Dialog`, `Sheet`, and everything built on them —
  `ResponsiveDialog`, `ResponsiveDrawer`, `MobileBottomSheet`) use Radix
  primitives, which provide: focus trap while open, `Escape` to close,
  focus return to the trigger on close, and `inert`/`aria-hidden` on the
  rest of the page while open.
- `ResponsiveTable` rows with `onRowClick` are `tabIndex={0}`,
  `role="button"`, and respond to `Enter`/`Space` — not just `onClick`.
- `ResponsiveSplitView`'s "Back" control is a real `<button>`, reachable
  and operable by keyboard, not a swipe-only gesture.
- Skip-to-content links are a per-app concern (added when each app's real
  page structure lands) — `ResponsiveContentContainer`'s `main` landmark
  in `ResponsiveAppShell` gives skip links a stable target
  (`<main>` is implicit; add `id="main-content"` in the app if a visible
  skip link is introduced).

## Focus visibility

`:focus-visible` in `src/styles/globals.css` applies a 2px high-contrast
ring (`--ring`, tuned separately per light/dark theme for sufficient
contrast) with a 2px offset to every focusable element — this is global,
not opt-in per component, so a new component automatically inherits it.

## Color contrast

Token pairs (`background`/`foreground`, `primary`/`primary-foreground`,
`brand`/`brand-foreground`, etc. in `globals.css`) are chosen to meet
4.5:1 for normal text / 3:1 for large text and UI components in both the
light and dark theme. `--warning` in particular uses a dark foreground
(`--warning-foreground`) rather than white, since amber backgrounds fail
contrast against white text.

## Reduced motion

- `@media (prefers-reduced-motion: reduce)` in `globals.css` collapses all
  CSS animation/transition durations to near-zero globally.
- Radix-driven enter/exit animations (`Dialog`, `Sheet`, `DropdownMenu`,
  `Tooltip`) additionally use Tailwind's `motion-reduce:animate-none` so
  they don't just speed up but fully skip the slide/fade/zoom.
- `LoadingState`'s spinner is the one place motion is load-bearing — under
  reduced motion it swaps from `animate-spin` to `animate-pulse`
  (`motion-reduce:animate-pulse`), staying legible as "busy" without a
  spin.
- `usePrefersReducedMotion()` (`src/hooks/use-breakpoint.ts`) is available
  for any JS-driven transition logic (e.g. choosing a slide direction)
  that CSS alone can't express.

## No essential horizontal scrolling

- `ResponsiveTable` hides lower-priority columns per breakpoint
  (`hideBelow`) instead of letting the table overflow and scroll.
- `ResponsiveDataView` switches to `ResponsiveCardList` below `md`
  (768px) — the same data, restacked vertically, so nothing is dropped
  and nothing requires a horizontal swipe to read.
- `ResponsiveFormLayout` is always a single column below `md`.
- The one intentional exception is `ResponsiveFilterBar`'s quick-filter
  chip row (`overflow-x-auto` + `scrollbar-none`) — every chip in it is
  also reachable through the "Filters" sheet/drawer, so the scrollable row
  is a convenience, not the only way to reach that content.

## Safe areas

`pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` utilities (backed by
`env(safe-area-inset-*)`) keep `MobileHeader`, `MobileBottomNavigation`,
and bottom-anchored sheets clear of notches, camera cutouts, and the home
indicator on devices that have them, while falling back to a sane minimum
padding on devices that don't report safe-area insets.

## Semantic structure & ARIA

- Navigation landmarks: `<nav aria-label="Primary">`,
  `aria-label="Secondary"`, `aria-label="Breadcrumb"` distinguish the
  shell's multiple `<nav>` elements for screen reader users.
- `aria-current="page"` marks the active nav item in every navigation
  component.
- Unread counts are included in the accessible name
  (`aria-label="Notifications, 3 unread"`), not conveyed by a colored dot
  alone.
- `ErrorState` uses `role="alert"` so assistive tech announces failures
  immediately; `LoadingState` and `OfflineState` use `role="status"` for
  polite, non-interrupting announcements.
- Form fields built with `FormField` (`ResponsiveFormLayout`) wire
  `aria-describedby` (hint/error) and `aria-invalid` automatically onto
  the child control.

## Verifying this in Storybook

The `@storybook/addon-a11y` addon runs `axe-core` against the currently
selected story on the `wcag2a`, `wcag2aa`, and `wcag22aa` rule sets (see
`.storybook/preview.tsx`). Treat any violation surfaced there as a bug to
fix before merging a new or changed component, not a preference to
override.
