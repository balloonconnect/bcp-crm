"use client";

import { ChevronsLeft, ChevronsRight, ChevronDown, LogOut, Settings } from "lucide-react";
import { cn } from "../../lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../primitives/tooltip";
import type { AppShellChrome } from "./nav-types";

export interface DesktopSidebarProps extends Pick<
  AppShellChrome,
  "primaryNavItems" | "studios" | "activeStudioId" | "onStudioChange" | "branches" | "activeBranchId" | "onBranchChange" | "user" | "logo" | "productName"
> {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSignOut?: () => void;
}

/**
 * Persistent left rail for the desktop tier (1024px+). Collapses to an
 * icon-only rail that still exposes every nav item via tooltip + focus,
 * so no functionality is hover-only.
 */
export function DesktopSidebar({
  primaryNavItems,
  studios,
  activeStudioId,
  onStudioChange,
  branches,
  activeBranchId,
  onBranchChange,
  user,
  logo,
  productName = "BCP Studio OS",
  collapsed,
  onToggleCollapsed,
  onSignOut,
}: DesktopSidebarProps) {
  const activeStudio = studios?.find((s) => s.id === activeStudioId);
  const studioBranches = branches?.filter((b) => b.studioId === activeStudioId);
  const activeBranch = studioBranches?.find((b) => b.id === activeBranchId);

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none lg:flex",
        collapsed ? "w-[72px]" : "w-[264px]",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        {logo}
        {!collapsed && <span className="truncate text-sm font-semibold">{productName}</span>}
      </div>

      {studios && studios.length > 0 && (
        <div className="border-b border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-h-touch-target w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  collapsed && "justify-center px-0",
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={activeStudio?.logoUrl} alt="" />
                  <AvatarFallback>{activeStudio?.name?.slice(0, 2).toUpperCase() ?? "ST"}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{activeStudio?.name ?? "Select studio"}</p>
                      {activeBranch && (
                        <p className="truncate text-xs text-sidebar-foreground/60">{activeBranch.name}</p>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Studios</DropdownMenuLabel>
              {studios.map((studio) => (
                <DropdownMenuItem key={studio.id} onSelect={() => onStudioChange?.(studio.id)}>
                  {studio.name}
                </DropdownMenuItem>
              ))}
              {studioBranches && studioBranches.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Branches</DropdownMenuLabel>
                  {studioBranches.map((branch) => (
                    <DropdownMenuItem key={branch.id} onSelect={() => onBranchChange?.(branch.id)}>
                      {branch.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const link = (
            <a
              key={item.id}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex min-h-touch-target items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                item.isActive ? "bg-sidebar-accent text-brand" : "text-sidebar-foreground/80",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                  {item.badge}
                </span>
              )}
            </a>
          );

          if (!collapsed) return link;

          return (
            <Tooltip key={item.id} delayDuration={200}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-h-touch-target w-full items-center gap-2 rounded-md px-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  collapsed && "justify-center px-0",
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-sidebar-foreground/60">{user.role}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mt-2 flex min-h-touch-target w-full items-center justify-center gap-2 rounded-md text-xs text-sidebar-foreground/70",
            "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
