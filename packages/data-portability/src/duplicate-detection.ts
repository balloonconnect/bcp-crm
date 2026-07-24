export type DuplicateHandling = "skip" | "overwrite" | "create_new";

/** "Duplicate handling" — a single decision function every import row's outcome is resolved through, given whether a matching existing record was found and which strategy the studio chose. Kept independent of *how* a duplicate is detected (that's a per-entity key lookup in `apps/api`, e.g. matching a lead by phone number) — this only decides what to do once one is. */
export function resolveDuplicateAction(existingRecordFound: boolean, strategy: DuplicateHandling): "insert" | "update" | "skip" {
  if (!existingRecordFound) return "insert";
  if (strategy === "skip") return "skip";
  if (strategy === "overwrite") return "update";
  return "insert"; // create_new: a duplicate key match doesn't block a new row from being created anyway
}
