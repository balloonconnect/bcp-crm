/**
 * Pure plan-limit checks. `null`/`undefined` limits mean "unlimited"
 * (matches SubscriptionPlan's nullable max* columns — Enterprise plans
 * typically have no cap). The caller loads current usage (a count query or
 * the current period's UsageRecord) and the plan's limit; this function
 * only implements the comparison + a consistent result shape.
 */
export interface PlanLimitCheck {
  allowed: boolean;
  limit: number | null;
  current: number;
  remaining: number | null;
}

export function checkPlanLimit(current: number, limit: number | null | undefined): PlanLimitCheck {
  if (limit === null || limit === undefined) {
    return { allowed: true, limit: null, current, remaining: null };
  }
  return {
    allowed: current < limit,
    limit,
    current,
    remaining: Math.max(limit - current, 0),
  };
}

export class PlanLimitExceededError extends Error {
  readonly code = "PLAN_LIMIT_EXCEEDED";
  constructor(
    public readonly metric: string,
    public readonly check: PlanLimitCheck,
  ) {
    super(`Plan limit exceeded for "${metric}": ${check.current}/${check.limit}`);
    this.name = "PlanLimitExceededError";
  }
}

export function assertWithinPlanLimit(metric: string, check: PlanLimitCheck): void {
  if (!check.allowed) {
    throw new PlanLimitExceededError(metric, check);
  }
}
