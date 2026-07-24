export interface LimitCheckResult {
  allowed: boolean;
  reason?: "overall_limit_reached" | "category_limit_reached";
  remaining?: number;
}

/** "Selection limit" — the overall cap across the whole album. A null limit means unlimited, checked separately from 0 the same way `@bcp/gallery`'s download limit is, since a studio setting an explicit 0 (e.g. "selection not open yet") is a real, distinguishable choice. */
export function checkSelectionLimit(currentSelectedCount: number, overallLimit: number | null): LimitCheckResult {
  if (overallLimit === null) return { allowed: true };
  if (currentSelectedCount >= overallLimit) return { allowed: false, reason: "overall_limit_reached", remaining: 0 };
  return { allowed: true, remaining: overallLimit - currentSelectedCount };
}

/** "Category limits" — checked independently of, and in addition to, the overall limit; a photo can be blocked by either one. Both are checked by the caller (`apps/api`'s selection service) in the same request, since a client needs to know *which* limit stopped them, not just that one did. */
export function checkCategoryLimit(currentCategoryCount: number, categoryLimit: number | null): LimitCheckResult {
  if (categoryLimit === null) return { allowed: true };
  if (currentCategoryCount >= categoryLimit) return { allowed: false, reason: "category_limit_reached", remaining: 0 };
  return { allowed: true, remaining: categoryLimit - currentCategoryCount };
}
