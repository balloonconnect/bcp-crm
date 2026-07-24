# Navigation Behavior

How BCP Studio OS apps navigate at each device tier, and why. Implemented by
`@bcp/ui`'s `ResponsiveAppShell` and its constituent components.

## Why three distinct patterns, not one that reflows

A sidebar that just shrinks its text, or a bottom nav that appears "when
there's room," tends to produce a navigation pattern that's technically
present but poorly suited to the input method and reach ergonomics of that
device. Instead, each tier gets a navigation pattern designed for how
people actually hold and touch that class of device:

- **Desktop** is mouse/keyboard-driven with abundant width — a persistent
  sidebar plus a top bar for infrequent, high-value actions (search,
  create, notifications) is the standard, discoverable pattern.
- **Tablet** is touch-driven but has enough width for a persistent icon
  rail — full labels aren't needed for recognition once someone has used
  the app a few times, and a rail leaves much more room for content than a
  labeled sidebar would at this width.
- **Mobile** is thumb-driven, one-handed, and narrow. The 5 most frequent
  destinations live within thumb reach at the bottom of the screen — the
  ergonomic zone — rather than at the top, which requires a reach or a
  second hand.

## Desktop (1024px and up)

| Element | Component | Behavior |
|---|---|---|
| Left sidebar | `DesktopSidebar` | Persistent, 264px expanded / 72px collapsed |
| Collapse toggle | `DesktopSidebar` | Bottom of sidebar; state is a controlled prop so the host app can persist it (e.g. to a cookie) |
| Top header | `ResponsiveAppShell` (built-in) | 64px, sticky, houses search/create/notifications |
| Global search | `ResponsiveAppShell` (built-in) | Button opens a centered search dialog; `/` is the documented shortcut affordance (host apps wire the actual keybinding) |
| Breadcrumbs | `ResponsivePageHeader` | Per-page, not shell-level — lives in the content area under the top bar |
| Quick-create menu | `ResponsiveAppShell` (built-in), via `quickCreateItems` prop | Dropdown from a brand-colored "Create" button |
| Notifications | `ResponsiveAppShell` (built-in), via `notifications` prop | Bell icon with unread-count dot; opens host-provided panel |
| Studio selector | `DesktopSidebar` | Dropdown at the top of the sidebar; shows logo + active branch |
| Branch selector | `DesktopSidebar` | Nested in the same dropdown, filtered to the active studio |

## Tablet (640–1023px)

| Element | Component | Behavior |
|---|---|---|
| Compact sidebar | `TabletNavigation` | Fixed 80px icon-only rail, primary nav items with tooltips |
| Navigation drawer | `TabletNavigation` | Triggered by the "Menu" icon at the top of the rail; contains studio/branch switching, primary + secondary nav, and account info |
| Adaptive content area | `ResponsiveSplitView`, `ResponsiveContentContainer` | Fills the remaining width; at `md` (768px)+, split views show both panes side by side instead of the mobile single-pane pattern |

Search, quick-create, and notifications are icon buttons at the bottom of
the rail (tooltip-labeled) rather than a separate top bar — there usually
isn't enough width at this tier for both a rail and a full top bar without
compressing the content area too far.

## Mobile (below 640px)

| Element | Component | Behavior |
|---|---|---|
| Compact header | `MobileHeader` | 56px, sticky, safe-area padded; shows menu trigger, current studio name, search, notifications |
| Bottom navigation | `MobileBottomNavigation` | Fixed, 5 slots exactly: **Home, Leads, Events, Payments, More** |
| Slide-out secondary menu | `ResponsiveAppShell` (built-in), via `Sheet` | Opened by the header's menu icon *or* the bottom nav's "More" slot; contains studio switching, full primary + secondary nav, sign-out |
| Full-screen search | `ResponsiveAppShell` (built-in) | Opened by the header's search icon; occupies the entire viewport rather than a small popover, since mobile keyboards already consume most of the vertical space |
| Floating quick action | Host app composition (e.g. a FAB above `MobileBottomNavigation`) | Not a fixed shell element — used selectively per page (e.g. "New lead" on the Leads list) so it doesn't compete with the bottom nav on every screen |

### Why exactly 5 bottom-nav slots

Research on bottom navigation (and BCP's own studio workflows) points to
Home, Leads, Events, and Payments as the four highest-frequency
destinations for a studio's day-to-day use; "More" is a deliberate escape
hatch to the full nav rather than a 6th cramped slot, which is why
`MobileBottomNavigationProps` intentionally doesn't accept an arbitrary
item count — only label/icon/href overrides per fixed slot.

## Shell composition

`ResponsiveAppShell` mounts `DesktopSidebar`, `TabletNavigation`, and
`MobileHeader` + `MobileBottomNavigation` all in the same render tree, and
lets Tailwind's responsive `hidden`/`flex` utilities decide which one is
visible. This means:

- No JS-driven layout thrashing on resize/rotate — the browser handles it
  the same way it handles any other CSS media query.
- No duplicate *focusable* chrome: hidden panels use `hidden`, which also
  removes them from the tab order and the accessibility tree.
- Server-rendered HTML already contains the correct chrome for every
  breakpoint; there's no client-only flash of the wrong pattern.
