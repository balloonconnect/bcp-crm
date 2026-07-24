import type { StudioPermissionContext } from "./rbac";

/**
 * Branch-level access, layered on top of permission checks. A studio user
 * with `branchId = null` is not restricted to one branch (an owner/admin/
 * manager who works across the whole studio); a user with a specific
 * `branchId` only sees that branch's data. See
 * @bcp/database docs/database-conventions.md § "Branch support" — this
 * mirrors the same rule the schema's nullable `StudioUser.branchId` is
 * documented against, so the two stay consistent by construction.
 */
export function canAccessBranch(
  context: StudioPermissionContext,
  targetBranchId: string | null | undefined,
): boolean {
  if (context.branchId === null) return true;
  if (targetBranchId === null || targetBranchId === undefined) return true; // branch-agnostic resource
  return context.branchId === targetBranchId;
}

export class BranchAccessDeniedError extends Error {
  readonly code = "BRANCH_ACCESS_DENIED";
  constructor(targetBranchId: string) {
    super(`No access to branch "${targetBranchId}"`);
    this.name = "BranchAccessDeniedError";
  }
}

export function assertCanAccessBranch(
  context: StudioPermissionContext,
  targetBranchId: string | null | undefined,
): void {
  if (!canAccessBranch(context, targetBranchId)) {
    throw new BranchAccessDeniedError(targetBranchId as string);
  }
}
