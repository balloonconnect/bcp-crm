"use client";

import { Menu, Search, Bell } from "lucide-react";
import { cn } from "../../lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import type { AppShellChrome } from "./nav-types";

export interface MobileHeaderProps
  extends Pick<AppShellChrome, "studios" | "activeStudioId" | "user" | "notifications" | "logo" | "productName"> {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

/**
 * Fixed compact header for the mobile tier (base + xs, <640px). Kept to a
 * single 56px row: menu trigger, current studio name, search, notifications.
 * Heavier chrome (studio switching, secondary nav) lives in the slide-out
 * menu opened via `onOpenMenu`.
 */
export function MobileHeader({
  studios,
  activeStudioId,
  user,
  notifications,
  onOpenMenu,
  onOpenSearch,
  logo,
  productName = "BCP Studio OS",
}: MobileHeaderProps) {
  const activeStudio = studios?.find((s) => s.id === activeStudioId);

  return (
    <header
      className={cn(
        "sticky top-0 z-sticky-chrome flex h-14 items-center gap-2 border-b bg-card/95 px-3 pt-safe backdrop-blur",
        "sm:hidden",
      )}
    >
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMenu}
        className="flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {logo}
        <span className="truncate text-sm font-semibold">{activeStudio?.name ?? productName}</span>
      </div>

      <button
        type="button"
        aria-label="Search"
        onClick={onOpenSearch}
        className="flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      {notifications && (
        <button
          type="button"
          aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`}
          onClick={notifications.onOpen}
          className="relative flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {notifications.unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          )}
        </button>
      )}

      {user && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={user.avatarUrl} alt="" />
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </header>
  );
}
