import type { StudioPermissionKey } from "./catalog";
import { can, type StudioPermissionContext } from "./rbac";
import { canAccessBranch } from "./branch-access";

export interface ResourceAccessInput {
  /** The permission that normally grants access (e.g. "gallery:manage"). */
  permission: StudioPermissionKey;
  /** Branch the resource belongs to, if any. */
  resourceBranchId?: string | null;
  /**
   * If provided along with `resourceOwnerId`, an actor who lacks
   * `permission` but *is* the resource owner is still allowed through —
   * e.g. a Freelancer without "gallery:manage" can still edit a gallery
   * from their own assigned shoot.
   */
  resourceOwnerId?: string | null;
  actorId?: string;
}

/**
 * The general-purpose "can this studio user touch this specific row"
 * check: permission catalog + branch scoping + an optional ownership
 * escape hatch, combined in one place so route handlers don't hand-roll
 * this logic per resource type.
 */
export function canAccessResource(
  context: StudioPermissionContext,
  input: ResourceAccessInput,
): boolean {
  const hasBranchAccess = canAccessBranch(context, input.resourceBranchId ?? null);
  if (!hasBranchAccess) return false;

  if (can(context, input.permission)) return true;

  if (input.resourceOwnerId && input.actorId && input.resourceOwnerId === input.actorId) {
    return true;
  }

  return false;
}

export class ResourceAccessDeniedError extends Error {
  readonly code = "RESOURCE_ACCESS_DENIED";
  constructor() {
    super("Not permitted to access this resource");
    this.name = "ResourceAccessDeniedError";
  }
}

export function assertCanAccessResource(
  context: StudioPermissionContext,
  input: ResourceAccessInput,
): void {
  if (!canAccessResource(context, input)) {
    throw new ResourceAccessDeniedError();
  }
}
