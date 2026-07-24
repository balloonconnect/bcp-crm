import { PermissionDeniedError } from "./rbac";
import { BranchAccessDeniedError } from "./branch-access";
import { ResourceAccessDeniedError } from "./resource-access";
import { FeatureNotEnabledError } from "./feature-flags";
import { PlanLimitExceededError } from "./plan-restrictions";

/**
 * Every error this package throws, and the HTTP status apps/api's error
 * handler maps it to. Kept here (not duplicated in apps/api) so adding a
 * new guard error can't silently fall through to a generic 500.
 */
export const GUARD_ERROR_STATUS: Record<string, number> = {
  PERMISSION_DENIED: 403,
  BRANCH_ACCESS_DENIED: 403,
  RESOURCE_ACCESS_DENIED: 403,
  FEATURE_NOT_ENABLED: 402,
  PLAN_LIMIT_EXCEEDED: 402,
};

export type GuardError =
  | PermissionDeniedError
  | BranchAccessDeniedError
  | ResourceAccessDeniedError
  | FeatureNotEnabledError
  | PlanLimitExceededError;

export function isGuardError(error: unknown): error is GuardError {
  return (
    error instanceof PermissionDeniedError ||
    error instanceof BranchAccessDeniedError ||
    error instanceof ResourceAccessDeniedError ||
    error instanceof FeatureNotEnabledError ||
    error instanceof PlanLimitExceededError
  );
}

export function guardErrorStatus(error: GuardError): number {
  return GUARD_ERROR_STATUS[error.code] ?? 403;
}

/**
 * Curried guard factory: `requirePermission("booking:manage")(context)`
 * throws if the context lacks the permission, otherwise returns the
 * (narrowed) context. Framework-agnostic — apps/api wraps this in a
 * Fastify `preHandler` (see apps/api/src/plugins/auth-guard.ts) that
 * resolves the context from `request.tenant` and calls this.
 */
export function requirePermission<TContext extends { permissions: readonly string[] }>(
  permission: string,
) {
  return (context: TContext): TContext => {
    if (!context.permissions.includes(permission)) {
      throw new PermissionDeniedError(permission);
    }
    return context;
  };
}
