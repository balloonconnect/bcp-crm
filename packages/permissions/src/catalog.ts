import type { PlatformRoleKey, StudioRoleKey } from "@bcp/types";

export type { PlatformRoleKey, StudioRoleKey };

/**
 * Canonical role/permission catalog for BCP Studio OS. This is the source
 * of truth both `pnpm db:seed` (packages/database/prisma/seed.ts) and the
 * runtime RBAC checks in this package are built from — role/permission
 * *keys* live here once, not duplicated between seed data and app logic.
 * The role key unions themselves (`PlatformRoleKey`/`StudioRoleKey`) live
 * in @bcp/types, since that package has no dependencies and both
 * @bcp/permissions and @bcp/auth need them without pulling this catalog in.
 */

// ═══════════════════════════════════════════════════════════════════════
// PLATFORM
// ═══════════════════════════════════════════════════════════════════════

export const PLATFORM_PERMISSIONS = [
  { key: "studio:view", label: "View studios", category: "Studios" },
  { key: "studio:manage", label: "Manage studios", category: "Studios" },
  { key: "studio:suspend", label: "Suspend or reinstate studios", category: "Studios" },
  { key: "license:issue", label: "Issue license keys", category: "Licensing" },
  { key: "license:revoke", label: "Revoke license keys", category: "Licensing" },
  { key: "plan:manage", label: "Manage subscription plans", category: "Billing" },
  { key: "payment:view", label: "View payments & revenue", category: "Billing" },
  { key: "feature_flag:manage", label: "Manage feature flags", category: "Platform" },
  { key: "platform_user:manage", label: "Manage platform staff & roles", category: "Platform" },
  { key: "storage:view", label: "View storage usage", category: "Infrastructure" },
  { key: "job:manage", label: "View & retry background jobs", category: "Infrastructure" },
  { key: "health:view", label: "View system health", category: "Infrastructure" },
  { key: "system_config:manage", label: "Manage system configuration & providers", category: "Platform" },
  { key: "announcement:manage", label: "Manage announcements", category: "Platform" },
  { key: "support_request:manage", label: "Manage studio support requests", category: "Support" },
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSIONS)[number]["key"];

/**
 * Platform roles. Fixed set (unlike studio roles, platform-side roles are
 * not customizable — this is BCP Studio OS's own staff structure).
 */
const ALL_PLATFORM_PERMISSIONS = PLATFORM_PERMISSIONS.map((p) => p.key);

export const PLATFORM_ROLE_DEFINITIONS: Record<
  PlatformRoleKey,
  { name: string; description: string; permissions: PlatformPermissionKey[] }
> = {
  super_admin: {
    name: "Super Admin",
    description: "Full access, including managing other platform staff and their roles.",
    permissions: ALL_PLATFORM_PERMISSIONS,
  },
  platform_admin: {
    name: "Platform Admin",
    description: "Full operational access; cannot manage other platform staff accounts.",
    permissions: ALL_PLATFORM_PERMISSIONS.filter((p) => p !== "platform_user:manage"),
  },
  platform_support: {
    name: "Platform Support",
    description: "Studio visibility, license support actions, and studio support-ticket handling.",
    permissions: ["studio:view", "license:issue", "support_request:manage", "health:view"],
  },
  platform_finance: {
    name: "Platform Finance",
    description: "Billing, licensing, and payment visibility across every studio.",
    permissions: ["studio:view", "plan:manage", "license:issue", "license:revoke", "payment:view"],
  },
  platform_viewer: {
    name: "Platform Viewer",
    description: "Read-only visibility into studios, system health, and storage. No mutating actions.",
    permissions: ["studio:view", "health:view", "storage:view"],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// STUDIO
// ═══════════════════════════════════════════════════════════════════════

export const STUDIO_PERMISSIONS = [
  { key: "studio:manage", label: "Manage studio profile & branding", category: "Studio" },
  { key: "branch:manage", label: "Manage branches", category: "Studio" },
  { key: "domain:manage", label: "Manage custom domains", category: "Studio" },
  { key: "user:manage", label: "Manage studio users & invitations", category: "Team" },
  { key: "role:manage", label: "Manage custom roles", category: "Team" },
  { key: "lead:manage", label: "Manage leads", category: "Sales" },
  { key: "lead:view", label: "View leads", category: "Sales" },
  { key: "client:manage", label: "Manage client profiles", category: "Sales" },
  { key: "client:view", label: "View client profiles", category: "Sales" },
  { key: "service:manage", label: "Manage services catalog", category: "Catalog" },
  { key: "service:view", label: "View services catalog", category: "Catalog" },
  { key: "package:manage", label: "Manage packages", category: "Catalog" },
  { key: "package:view", label: "View packages", category: "Catalog" },
  { key: "quotation:manage", label: "Manage quotations", category: "Sales" },
  { key: "quotation:view", label: "View quotations", category: "Sales" },
  { key: "enquiry_form:manage", label: "Manage public enquiry forms", category: "Sales" },
  { key: "enquiry_form:view", label: "View public enquiry forms", category: "Sales" },
  { key: "booking:manage", label: "Manage bookings", category: "Bookings" },
  { key: "booking:view", label: "View bookings", category: "Bookings" },
  { key: "shoot:manage", label: "Assign & manage shoots", category: "Shoots" },
  { key: "shoot:view", label: "View shoots", category: "Shoots" },
  { key: "equipment:manage", label: "Manage equipment catalog", category: "Shoots" },
  { key: "equipment:view", label: "View equipment catalog", category: "Shoots" },
  { key: "workflow:manage", label: "Manage workflow & task templates", category: "Shoots" },
  { key: "task:manage", label: "Manage tasks", category: "Shoots" },
  { key: "task:view", label: "View tasks", category: "Shoots" },
  { key: "team:manage", label: "Manage team member HR details", category: "Team" },
  { key: "team:view", label: "View team member profiles", category: "Team" },
  { key: "attendance:manage", label: "Record attendance & leave", category: "Team" },
  { key: "attendance:view_own", label: "View own attendance & leave", category: "Team" },
  { key: "freelancer_payment:manage", label: "Manage freelancer payments", category: "Team" },
  { key: "gallery:manage", label: "Manage galleries", category: "Galleries" },
  { key: "gallery:view", label: "View galleries", category: "Galleries" },
  { key: "album:manage", label: "Manage album designs", category: "Albums" },
  { key: "album:view", label: "View album designs", category: "Albums" },
  { key: "invoice:manage", label: "Manage invoices", category: "Finance" },
  { key: "invoice:view", label: "View invoices", category: "Finance" },
  { key: "payment:record", label: "Record payments", category: "Finance" },
  { key: "payment:view", label: "View payments", category: "Finance" },
  { key: "expense:manage", label: "Manage expenses", category: "Finance" },
  { key: "expense:view", label: "View expenses", category: "Finance" },
  { key: "vendor:manage", label: "Manage vendors, purchase orders & bills", category: "Finance" },
  { key: "whatsapp:manage", label: "Configure WhatsApp & templates", category: "Communication" },
  { key: "email:manage", label: "Configure email & templates", category: "Communication" },
  { key: "email:send", label: "Send emails", category: "Communication" },
  { key: "email:view", label: "View email log", category: "Communication" },
  { key: "whatsapp:send", label: "Send WhatsApp messages", category: "Communication" },
  { key: "whatsapp:view", label: "View WhatsApp message log", category: "Communication" },
  { key: "vendor:view", label: "View vendors, purchase orders & bills", category: "Finance" },
  { key: "billing:manage", label: "Manage subscription & billing", category: "Billing" },
  { key: "api_key:manage", label: "Manage API keys", category: "Integrations" },
  { key: "webhook:manage", label: "Manage webhooks", category: "Integrations" },
  { key: "report:view", label: "View reports", category: "Reports" },
] as const;

export type StudioPermissionKey = (typeof STUDIO_PERMISSIONS)[number]["key"];

const ALL_STUDIO_PERMISSIONS = STUDIO_PERMISSIONS.map((p) => p.key);
const ALL_VIEW_PERMISSIONS = STUDIO_PERMISSIONS.map((p) => p.key).filter((k) =>
  k.endsWith(":view"),
);

export const STUDIO_ROLE_DEFINITIONS: Record<
  StudioRoleKey,
  { name: string; description: string; permissions: StudioPermissionKey[] }
> = {
  owner: {
    name: "Owner",
    description: "Full access to everything in the studio, including billing.",
    permissions: ALL_STUDIO_PERMISSIONS,
  },
  admin: {
    name: "Admin",
    description: "Full operational access; billing stays owner-only.",
    permissions: ALL_STUDIO_PERMISSIONS.filter((p) => p !== "billing:manage"),
  },
  manager: {
    name: "Manager",
    description: "Runs day-to-day operations across branches: leads, bookings, shoots, deliverables.",
    permissions: [
      "branch:manage",
      "user:manage",
      "lead:manage",
      "lead:view",
      "client:manage",
      "client:view",
      "service:manage",
      "service:view",
      "package:manage",
      "package:view",
      "quotation:manage",
      "quotation:view",
      "enquiry_form:manage",
      "enquiry_form:view",
      "booking:manage",
      "booking:view",
      "shoot:manage",
      "shoot:view",
      "equipment:manage",
      "equipment:view",
      "workflow:manage",
      "task:manage",
      "task:view",
      "team:manage",
      "team:view",
      "attendance:manage",
      "freelancer_payment:manage",
      "whatsapp:manage",
      "whatsapp:send",
      "whatsapp:view",
      "email:manage",
      "email:send",
      "email:view",
      "gallery:manage",
      "gallery:view",
      "album:manage",
      "album:view",
      "report:view",
    ],
  },
  sales: {
    name: "Sales",
    description: "Owns the lead pipeline and booking conversion.",
    permissions: ["lead:manage", "lead:view", "client:manage", "client:view", "service:view", "package:view", "quotation:manage", "quotation:view", "enquiry_form:manage", "enquiry_form:view", "booking:manage", "booking:view", "report:view", "attendance:view_own", "whatsapp:send", "whatsapp:view", "email:send", "email:view"],
  },
  photographer: {
    name: "Photographer",
    description: "Sees assigned shoots and manages the galleries from them.",
    permissions: ["shoot:view", "booking:view", "gallery:manage", "gallery:view", "task:view", "task:manage", "attendance:view_own"],
  },
  videographer: {
    name: "Videographer",
    description: "Sees assigned shoots and manages the galleries from them.",
    permissions: ["shoot:view", "booking:view", "gallery:manage", "gallery:view", "task:view", "task:manage", "attendance:view_own"],
  },
  editor: {
    name: "Editor",
    description: "Edits and curates galleries and album designs.",
    permissions: ["gallery:manage", "gallery:view", "album:manage", "album:view"],
  },
  album_designer: {
    name: "Album Designer",
    description: "Designs albums from finalized galleries.",
    permissions: ["album:manage", "album:view", "gallery:view"],
  },
  accountant: {
    name: "Accountant",
    description: "Manages invoices, payments, and expenses; sees financial reports.",
    permissions: [
      "invoice:manage",
      "invoice:view",
      "payment:record",
      "payment:view",
      "expense:manage",
      "expense:view",
      "vendor:manage",
      "vendor:view",
      "report:view",
      "attendance:view_own",
    ],
  },
  freelancer: {
    name: "Freelancer",
    description: "External contractor with narrow, view-mostly access to their assigned work.",
    permissions: ["shoot:view", "booking:view", "gallery:view", "task:view", "task:manage", "attendance:view_own"],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access across the studio. Cannot create, edit, or delete anything.",
    permissions: ALL_VIEW_PERMISSIONS,
  },
};
