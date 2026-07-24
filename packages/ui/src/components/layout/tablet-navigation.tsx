"use client";

import * as React from "react";
import { Menu, Search, Plus, Bell } from "lucide-react";
import { cn } from "../../lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../primitives/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "../primitives/tooltip";
import type { AppShellChrome } from "./nav-types";

export interface TabletNavigationProps extends AppShellChrome {
  onOpenSearch: () => void;
}

/**
 * Tablet tier (640–1023px): a fixed compact icon rail for primary nav plus
 * a drawer (triggered by the "Menu" icon) that surfaces studio/branch
 * switching, secondary nav, and account actions — the content area adapts
 * to the remaining width rather than reflowing into a mobile layout.
 */
export function TabletNavigation({
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
  onOpenSearch,
  logo,
  productName = "BCP Studio OS",
}: TabletNavigationProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const activeStudio = studios?.find((s) => s.id === activeStudioId);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-1 border-r bg-card py-3 sm:flex lg:hidden"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center">{logo}</div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="mb-2 flex h-touch-target w-touch-target items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>{productName}</SheetTitle>
          </SheetHeader>

          {studios && studios.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Studio</p>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={activeStudio?.logoUrl} alt="" />
                  <AvatarFallback>{activeStudio?.name?.slice(0, 2).toUpperCase() ?? "ST"}</AvatarFallback>
                </Avatar>
                <select
                  aria-label="Select studio"
                  value={activeStudioId}
                  onChange={(e) => onStudioChange?.(e.target.value)}
                  className="min-h-touch-target flex-1 bg-transparent text-sm focus-visible:outline-none"
                >
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {branches && branches.length > 0 && (
                <select
                  aria-label="Select branch"
                  value={activeBranchId}
                  onChange={(e) => onBranchChange?.(e.target.value)}
                  className="mt-2 min-h-touch-target w-full rounded-md border bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {branches
                    .filter((b) => b.studioId === activeStudioId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          )}

          <p className="mb-2 mt-5 text-xs font-medium uppercase text-muted-foreground">Menu</p>
          <ul className="space-y-1">
            {[...primaryNavItems, ...(secondaryNavItems ?? [])].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    aria-current={item.isActive ? "page" : undefined}
                    onClick={() => setDrawerOpen(false)}
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
          </ul>

          {user && (
            <div className="mt-6 flex items-center gap-2 border-t pt-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt="" />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="my-1 h-px w-8 bg-border" />

      <ul className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <a
                    href={item.href}
                    aria-current={item.isActive ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "relative flex h-touch-target w-touch-target items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      item.isActive ? "bg-accent text-brand" : "text-foreground/70",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.badge !== undefined && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                    )}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-col items-center gap-1 border-t pt-2">
        {quickCreateItems && quickCreateItems.length > 0 && (
          <button
            type="button"
            aria-label="Quick create"
            onClick={quickCreateItems[0]?.onSelect}
            className="flex h-touch-target w-touch-target items-center justify-center rounded-md bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label="Search"
          onClick={onOpenSearch}
          className="flex h-touch-target w-touch-target items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
        {notifications && (
          <button
            type="button"
            aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`}
            onClick={notifications.onOpen}
            className="relative flex h-touch-target w-touch-target items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notifications.unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
            )}
          </button>
        )}
        {user && (
          <Avatar className="mt-1 h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </nav>
  );
}
