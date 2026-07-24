import type { PlatformPermissionKey, PlatformRoleKey, StudioPermissionKey, StudioRoleKey } from "./catalog";

/**
 * What a request handler resolves once per request (see @bcp/auth's
 * tenant-resolution + apps/api's tenant-context plugin) and passes to
 * every permission check — never re-derived from client input.
 */
export interface StudioPermissionContext {
  actorType: "studio_user";
  studioUserId: string;
  studioId: string;
  /** `null` = not restricted to one branch (see docs/database-conventions.md § "Branch support"). */
  branchId: string | null;
  roleKeys: (StudioRoleKey | string)[];
  permissions: StudioPermissionKey[];
}

export interface PlatformPermissionContext {
  actorType: "platform_user";
  platformUserId: string;
  roleKeys: PlatformRoleKey[];
  permissions: PlatformPermissionKey[];
}

export type PermissionContext = StudioPermissionContext | PlatformPermissionContext;

export class PermissionDeniedError extends Error {
  readonly code = "PERMISSION_DENIED";
  constructor(permission: string) {
    super(`Missing required permission: "${permission}"`);
    this.name = "PermissionDeniedError";
  }
}

export function can(context: StudioPermissionContext, permission: StudioPermissionKey): boolean;
export function can(context: PlatformPermissionContext, permission: PlatformPermissionKey): boolean;
export function can(context: PermissionContext, permission: string): boolean {
  return (context.permissions as string[]).includes(permission);
}

export function canAny(context: PermissionContext, permissions: string[]): boolean {
  return permissions.some((p) => (context.permissions as string[]).includes(p));
}

export function canAll(context: PermissionContext, permissions: string[]): boolean {
  return permissions.every((p) => (context.permissions as string[]).includes(p));
}

export function assertCan(context: StudioPermissionContext, permission: StudioPermissionKey): void;
export function assertCan(context: PlatformPermissionContext, permission: PlatformPermissionKey): void;
export function assertCan(context: PermissionContext, permission: string): void {
  if (!can(context as StudioPermissionContext, permission as StudioPermissionKey)) {
    throw new PermissionDeniedError(permission);
  }
}

/**
 * Flattens a studio user's assigned StudioRole rows into one deduplicated
 * permission list. Called once per request by the service layer after
 * loading `StudioUserRole -> StudioRole` for the authenticated user —
 * never trust a permission list handed in from the client.
 */
export function flattenStudioPermissions(
  roles: { key: string; permissions: string[] }[],
): StudioPermissionKey[] {
  return Array.from(new Set(roles.flatMap((r) => r.permissions))) as StudioPermissionKey[];
}

export function flattenPlatformPermissions(
  roles: { key: string; permissions: string[] }[],
): PlatformPermissionKey[] {
  return Array.from(new Set(roles.flatMap((r) => r.permissions))) as PlatformPermissionKey[];
}
