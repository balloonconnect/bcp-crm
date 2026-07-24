export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string | null;
  score: number; // 0-1, provider-defined relevance
  url: string; // where selecting this result navigates to
}

export interface SearchQuery {
  studioId: string;
  query: string;
  entityTypes: string[]; // already filtered by permission before reaching a provider
  limit: number;
}

/**
 * "Use PostgreSQL search first. Keep architecture ready for
 * Meilisearch or Elasticsearch." — the same provider-abstraction
 * pattern this codebase already established for face recognition
 * (Prompt 28, `FaceRecognitionProvider`) and storage
 * (`StorageClient`): nothing in `apps/api`'s search orchestration
 * calls Prisma or a search engine's SDK directly. `PostgresSearchProvider`
 * (`apps/api`'s `postgres-search-provider.ts`) is the only
 * implementation today; swapping to Meilisearch or Elasticsearch later
 * means writing one new class against this same interface, not
 * touching the orchestration layer, the command menu, or any calling
 * code.
 */
export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResult[]>;
}
