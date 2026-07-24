import type { SearchResult } from "./provider";

/** Merges per-entity result sets into one ranked list — highest score first, capped to a total result count so the command menu never has to render an unbounded list regardless of how many entity types matched. */
export function mergeAndRankResults(resultSets: SearchResult[][], limit: number): SearchResult[] {
  return resultSets.flat().sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A simple, provider-agnostic relevance score: an exact match scores highest, a prefix match next, any substring match lowest — used by `PostgresSearchProvider` today, but the scoring shape itself (0-1, higher is better) is what any future provider's own relevance score needs to produce to slot into `mergeAndRankResults()` unchanged. */
export function scoreMatch(field: string, query: string): number {
  const normalizedField = field.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedField === normalizedQuery) return 1;
  if (normalizedField.startsWith(normalizedQuery)) return 0.8;
  if (normalizedField.includes(normalizedQuery)) return 0.5;
  return 0;
}
