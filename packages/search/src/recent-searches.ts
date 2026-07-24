const MAX_RECENT_SEARCHES = 10;

/** "Recent searches" — deduplicated (a repeated query moves to the front rather than appearing twice) and capped, the trimming logic every caller needs regardless of how recent searches are actually persisted. */
export function buildRecentSearchList(existingQueries: string[], newQuery: string): string[] {
  const deduped = [newQuery, ...existingQueries.filter((q) => q.toLowerCase() !== newQuery.toLowerCase())];
  return deduped.slice(0, MAX_RECENT_SEARCHES);
}
