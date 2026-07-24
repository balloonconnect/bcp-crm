"use client";

import * as React from "react";
import { Search, Plus, Bell, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useIsOnline } from "../../hooks/use-is-online";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import { Input } from "../primitives/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../primitives/sheet";
import { TooltipProvider } from "../primitives/tooltip";
import { OfflineState } from "../states/offline-state";
import { DesktopSidebar } from "./desktop-sidebar";
import { TabletNavigation } from "./tablet-navigation";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNavigation, type MobileBottomNavItem } from "./mobile-bottom-navigation";
import type { AppShellChrome, PrimaryMobileNavId } from "./nav-types";

export interface ResponsiveAppShellProps extends AppShellChrome {
  children: React.ReactNode;
  activeMobileNavId: PrimaryMobileNavId;
  mobileNavItems?: MobileBottomNavItem[];
  onSignOut?: () => void;
  className?: string;
}

/**
 * Composes every navigation-pattern component into one shell:
 * DesktopSidebar (lg+) · TabletNavigation (sm–md) · MobileHeader +
 * MobileBottomNavigation (below sm). Exactly one pattern is mounted at a
 * time per breakpoint via Tailwind's responsive display utilities, so no
 * hidden duplicate chrome exists in the accessibility tree.
 */
export function ResponsiveAppShell({
  children,
  activeMobileNavId,
  mobileNavItems,
  primaryNavItems,
  secondaryNavItems,
  studios,
  activeStudioId,
  onStudioChange,
  branches,
  activeBranchId,
  onBranchChange,
  user,
  notifications,
  quickCreateItems,
  onSearch,
  onSignOut,
  logo,
  productName = "BCP Studio OS",
  className,
}: ResponsiveAppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = React.useState(false);
  const isOnline = useIsOnline();

  return (
    <TooltipProvider delayDuration={200}>
    <div className={cn("flex min-h-dvh flex-col", className)}>
      {!isOnline && <OfflineState variant="banner" />}

      <div className="flex flex-1">
        <DesktopSidebar
          primaryNavItems={primaryNavItems}
          studios={studios}
          activeStudioId={activeStudioId}
          onStudioChange={onStudioChange}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={onBranchChange}
          user={user}
          logo={logo}
          productName={productName}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          onSignOut={onSignOut}
        />

        <TabletNavigation
          primaryNavItems={primaryNavItems}
          secondaryNavItems={secondaryNavItems}
          studios={studios}
          activeStudioId={activeStudioId}
          onStudioChange={onStudioChange}
          branches={branches}
          activeBranchId={activeBranchId}
          onBranchChange={onBranchChange}
          user={user}
          notifications={notifications}
          quickCreateItems={quickCreateItems}
          logo={logo}
          productName={productName}
          onOpenSearch={() => setMobileSearchOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop-only top bar: global search, quick-create, notifications. */}
          <header className="sticky top-0 z-sticky-chrome hidden h-16 items-center gap-3 border-b bg-card/95 px-6 backdrop-blur lg:flex">
            <button
              type="button"
              onClick={() => setDesktopSearchOpen(true)}
              className="flex min-h-touch-target flex-1 max-w-md items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search leads, bookings, clients…
              <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">/</kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              {quickCreateItems && quickCreateItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-touch-target items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-brand-foreground hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {quickCreateItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.id} onSelect={item.onSelect}>
                          <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {notifications && (
                <button
                  type="button"
                  onClick={notifications.onOpen}
                  aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`}
                  className="relative flex h-touch-target w-touch-target items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {notifications.unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </header>

          <MobileHeader
            studios={studios}
            activeStudioId={activeStudioId}
            user={user}
            notifications={notifications}
            logo={logo}
            productName={productName}
            onOpenMenu={() => setMobileMenuOpen(true)}
            onOpenSearch={() => setMobileSearchOpen(true)}
          />

          <main className="flex-1 pb-20 sm:pb-0">{children}</main>
        </div>
      </div>

      <MobileBottomNavigation items={mobileNavItems} activeId={activeMobileNavId} />

      {/* Mobile slide-out secondary menu (hamburger). */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm">
          <SheetHeader>
            <SheetTitle>{productName}</SheetTitle>
          </SheetHeader>

          {user && (
            <div className="mt-4 flex items-center gap-3 rounded-md border p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl} alt="" />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
          )}

          {studios && studios.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Studio</p>
              <select
                aria-label="Select studio"
                value={activeStudioId}
                onChange={(e) => onStudioChange?.(e.target.value)}
                className="min-h-touch-target w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {studios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav aria-label="Secondary" className="mt-5">
            <ul className="space-y-1">
              {[...primaryNavItems, ...(secondaryNavItems ?? [])].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      aria-current={item.isActive ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex min-h-touch-target items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        item.isActive ? "bg-accent text-brand" : "text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </a>
                  </li>
                );
              })}
              {onSignOut && (
                <li className="mt-3 border-t pt-3">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex min-h-touch-target w-full items-center rounded-md px-3 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Sign out
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Full-screen mobile search. */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-dialog flex flex-col bg-background pt-safe sm:hidden">
          <div className="flex items-center gap-2 border-b p-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              type="search"
              placeholder="Search leads, bookings, clients…"
              onChange={(e) => onSearch?.(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop/tablet search dialog. */}
      {desktopSearchOpen && (
        <div
          className="fixed inset-0 z-dialog hidden items-start justify-center bg-overlay/60 pt-24 sm:flex"
          onClick={() => setDesktopSearchOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="w-full max-w-lg rounded-lg border bg-card p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                type="search"
                placeholder="Search leads, bookings, clients…"
                onChange={(e) => onSearch?.(e.target.value)}
                className="border-0 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setDesktopSearchOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
