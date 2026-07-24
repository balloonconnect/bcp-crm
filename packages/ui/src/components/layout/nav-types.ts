import type { LucideIcon } from "lucide-react";
import type * as React from "react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a small numeric/status badge (e.g. unread leads). */
  badge?: string | number;
  /** Marks the item active when the current path matches; defaults to exact match on href. */
  isActive?: boolean;
}

/** The 5 fixed slots in MobileBottomNavigation — "more" always opens the slide-out menu. */
export type PrimaryMobileNavId = "home" | "leads" | "events" | "payments" | "more";

export interface StudioOption {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  studioId: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

export interface QuickCreateItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export interface NotificationSummary {
  unreadCount: number;
  onOpen: () => void;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface AppShellChrome {
  primaryNavItems: NavItem[];
  secondaryNavItems?: NavItem[];
  studios?: StudioOption[];
  activeStudioId?: string;
  onStudioChange?: (studioId: string) => void;
  branches?: BranchOption[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  user?: CurrentUser;
  notifications?: NotificationSummary;
  quickCreateItems?: QuickCreateItem[];
  onSearch?: (query: string) => void;
  logo?: React.ReactNode;
  productName?: string;
}
