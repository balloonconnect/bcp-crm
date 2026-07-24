import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Repeat,
  KeyRound,
  Wallet,
  Globe,
  HardDrive,
  Sparkles,
  MessageSquare,
  Flag,
  Megaphone,
  LifeBuoy,
  ScrollText,
  Settings,
  ListChecks,
  HeartPulse,
  Archive,
} from "lucide-react";

export interface PlatformModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** The permission that gates both the nav item and the page itself. */
  permission: string;
}

/**
 * All 18 modules plus the dashboard. Each entry's `permission` is checked
 * against the signed-in platform user's flattened permission list
 * (`usePermission` from @bcp/permissions/client) — a module a role can't
 * access simply doesn't render in the nav, and its page independently
 * redirects if visited directly.
 */
export const PLATFORM_MODULES: PlatformModule[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, permission: "studio:view" },
  { id: "studios", label: "Studios", href: "/studios", icon: Building2, permission: "studio:view" },
  { id: "users", label: "Users", href: "/users", icon: Users, permission: "studio:view" },
  { id: "plans", label: "Plans", href: "/plans", icon: CreditCard, permission: "plan:manage" },
  { id: "subscriptions", label: "Subscriptions", href: "/subscriptions", icon: Repeat, permission: "studio:view" },
  { id: "licenses", label: "Licenses", href: "/licenses", icon: KeyRound, permission: "license:issue" },
  { id: "payments", label: "Payments", href: "/payments", icon: Wallet, permission: "payment:view" },
  { id: "domains", label: "Domains", href: "/domains", icon: Globe, permission: "studio:view" },
  { id: "storage", label: "Storage", href: "/storage", icon: HardDrive, permission: "storage:view" },
  { id: "ai-providers", label: "AI Providers", href: "/providers/ai", icon: Sparkles, permission: "system_config:manage" },
  {
    id: "messaging-providers",
    label: "Messaging Providers",
    href: "/providers/messaging",
    icon: MessageSquare,
    permission: "system_config:manage",
  },
  { id: "feature-flags", label: "Feature Flags", href: "/feature-flags", icon: Flag, permission: "feature_flag:manage" },
  { id: "announcements", label: "Announcements", href: "/announcements", icon: Megaphone, permission: "announcement:manage" },
  {
    id: "support-requests",
    label: "Support Requests",
    href: "/support-requests",
    icon: LifeBuoy,
    permission: "support_request:manage",
  },
  { id: "audit-logs", label: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "studio:view" },
  { id: "system-config", label: "System Configuration", href: "/system-config", icon: Settings, permission: "system_config:manage" },
  { id: "jobs", label: "Job Monitoring", href: "/jobs", icon: ListChecks, permission: "job:manage" },
  { id: "health", label: "Health Monitoring", href: "/health", icon: HeartPulse, permission: "health:view" },
  { id: "backups", label: "Studio Backups", href: "/backups", icon: Archive, permission: "studio:manage" },
];
