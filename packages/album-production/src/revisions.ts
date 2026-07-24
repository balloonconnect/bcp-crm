export interface AlbumForRevisionCheck {
  revisionLimit: number | null;
}

/** "Revision limits" — a null limit means unlimited free revisions; an explicit limit is checked against how many rounds have actually been requested so far (`AlbumRevisionRequest` count), not how many are "in progress," since a round is consumed the moment it's requested regardless of outcome. */
export function hasReachedRevisionLimit(album: AlbumForRevisionCheck, roundsRequestedSoFar: number): boolean {
  if (album.revisionLimit === null) return false;
  return roundsRequestedSoFar >= album.revisionLimit;
}

export function resolveNextRoundNumber(roundsRequestedSoFar: number): number {
  return roundsRequestedSoFar + 1;
}
