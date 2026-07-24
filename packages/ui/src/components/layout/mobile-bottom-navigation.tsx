"use client";

import { Home, Users, CalendarDays, Wallet, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import type { PrimaryMobileNavId } from "./nav-types";

export interface MobileBottomNavItem {
  id: PrimaryMobileNavId;
  label: string;
  href?: string;
  /** Override the default icon for this slot if needed. */
  icon?: LucideIcon;
  badge?: number;
  /** For "more": open the slide-out secondary menu instead of navigating. */
  onSelect?: () => void;
}

export interface MobileBottomNavigationProps {
  items?: MobileBottomNavItem[];
  activeId: PrimaryMobileNavId;
}

const defaultIcons: Record<PrimaryMobileNavId, LucideIcon> = {
  home: Home,
  leads: Users,
  events: CalendarDays,
  payments: Wallet,
  more: MoreHorizontal,
};

const defaultItems: MobileBottomNavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "leads", label: "Leads", href: "/leads" },
  { id: "events", label: "Events", href: "/events" },
  { id: "payments", label: "Payments", href: "/payments" },
  { id: "more", label: "More" },
];

/**
 * Fixed 5-slot bottom nav for the mobile tier — the requirement is exactly
 * Home / Leads / Events / Payments / More, so this intentionally does not
 * accept an arbitrary-length item list; pass `items` only to override
 * labels/icons/hrefs per app, not the slot count.
 */
export function MobileBottomNavigation({ items = defaultItems, activeId }: MobileBottomNavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-sticky-chrome grid grid-cols-5 border-t bg-card pb-safe",
        "sm:hidden",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon ?? defaultIcons[item.id];
        const isActive = item.id === activeId;
        const content = (
          <>
            <span className="relative flex h-6 w-6 items-center justify-center">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-foreground"
                  aria-hidden="true"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium leading-none">{item.label}</span>
          </>
        );

        const className = cn(
          "flex min-h-touch-target flex-col items-center justify-center gap-1 py-2 text-xs",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
          isActive ? "text-brand" : "text-muted-foreground",
        );

        if (item.id === "more" || !item.href) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label}${item.badge ? `, ${item.badge} unread` : ""}`}
              className={className}
            >
              {content}
            </button>
          );
        }

        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${item.label}${item.badge ? `, ${item.badge} unread` : ""}`}
            className={className}
          >
            {content}
          </a>
        );
      })}
    </nav>
  );
}
