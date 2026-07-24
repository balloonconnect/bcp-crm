/**
 * Platform-side roles. Must stay in sync with the seeded PlatformRole rows
 * in packages/database/prisma/seed.ts and the catalog in
 * @bcp/permissions/catalog — that package is the source of truth for what
 * each role can do; this is just the closed set of role *keys*.
 */
export type PlatformRoleKey =
  | "super_admin"
  | "platform_admin"
  | "platform_support"
  | "platform_finance"
  | "platform_viewer";

/**
 * Studio-side roles. Every studio is seeded with all eleven as system
 * roles (see prisma/seed.ts); studios may additionally define custom
 * StudioRole rows with any permission subset — this union only names the
 * built-in set, custom role keys are validated as plain strings at the
 * database layer instead (see @bcp/database docs/database-conventions.md
 * § "Roles & permissions").
 */
export type StudioRoleKey =
  | "owner"
  | "admin"
  | "manager"
  | "sales"
  | "photographer"
  | "videographer"
  | "editor"
  | "album_designer"
  | "accountant"
  | "freelancer"
  | "viewer";

export interface User {
  id: string;
  studioId: string | null;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
