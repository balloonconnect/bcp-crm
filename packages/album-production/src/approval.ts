export interface SpreadForApprovalCheck {
  spreadNumber: number;
  status: string;
}

/**
 * "Full album approval" requires every current spread to individually
 * be `approved` first — a studio can't mark the whole album approved
 * while one spread is still sitting in `revision_requested`, since
 * that would silently override the client's own unresolved feedback
 * on that page. Takes the *current* version of each spread number
 * only (the caller filters to `isCurrent: true` before calling this),
 * since an old, superseded version's approval status is irrelevant
 * once a new version has replaced it.
 */
export function canApproveFullAlbum(currentSpreads: SpreadForApprovalCheck[]): boolean {
  if (currentSpreads.length === 0) return false;
  return currentSpreads.every((s) => s.status === "approved");
}

export function countUnapprovedSpreads(currentSpreads: SpreadForApprovalCheck[]): number {
  return currentSpreads.filter((s) => s.status !== "approved").length;
}
