export type AlbumSelectionPhase = "open" | "locked";

export function resolvePhase(lockedAt: Date | null): AlbumSelectionPhase {
  return lockedAt ? "locked" : "open";
}

/** A client can only submit (which locks the album) while it's genuinely open — submitting an already-locked album isn't meaningful and would just overwrite the lock timestamp for no reason. */
export function canSubmit(lockedAt: Date | null): boolean {
  return resolvePhase(lockedAt) === "open";
}

/** Editing an individual selection (select/deselect/favorite/comment) is blocked once locked — "Lock selection" is a real stop, not advisory, the same way `Album.lockedAt` being set is the one condition every mutation in `apps/api`'s selection service checks first. */
export function canEditSelection(lockedAt: Date | null): boolean {
  return resolvePhase(lockedAt) === "open";
}

/** Only the studio can reopen — this function only encodes "a locked album is the one state reopen is meaningful from," not who's allowed to call it (that's a permission check in `apps/api`, not a selection-state question). */
export function canReopen(lockedAt: Date | null): boolean {
  return resolvePhase(lockedAt) === "locked";
}
