export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewActionType = "approved" | "rejected" | "undone";

export interface ReviewTransition {
  newStatus: ReviewStatus;
  action: ReviewActionType;
}

/**
 * "Approve" and "Reject" are always available regardless of current
 * status (a studio can change its mind — approve something it
 * previously rejected, or vice versa), which is simpler and more
 * honest than a rigid state machine that would need special-casing for
 * every reconsideration. The one rule enforced here: neither action,
 * nor undo, ever implies anything about the underlying photo — see
 * `@bcp/photo-intelligence`'s module-level doc comment.
 */
export function resolveReviewTransition(action: "approve" | "reject"): ReviewTransition {
  return { newStatus: action === "approve" ? "approved" : "rejected", action: action === "approve" ? "approved" : "rejected" };
}

export interface ReviewLogForUndo {
  previousStatus: ReviewStatus;
  newStatus: ReviewStatus;
  action: ReviewActionType;
}

/**
 * "Undo" restores the status a review log's own `previousStatus`
 * recorded — never a guess, never "back to pending" by default,
 * because the actual prior state (which might itself have been
 * "approved" from an earlier decision) is exactly what's in that log
 * row. Undoing an already-undone entry isn't meaningful, so it's
 * rejected here rather than silently producing a confusing double-undo.
 */
export function resolveUndo(mostRecentLog: ReviewLogForUndo): ReviewStatus {
  if (mostRecentLog.action === "undone") throw new Error("This action has already been undone.");
  return mostRecentLog.previousStatus;
}
