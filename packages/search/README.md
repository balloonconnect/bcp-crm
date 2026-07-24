# @bcp/search

Pure logic for global search: the 13-entity registry (each tagged with
its required permission), the `SearchProvider` abstraction ("use
PostgreSQL search first, keep architecture ready for Meilisearch or
Elasticsearch"), result ranking, and recent-search list management. No
database access — `apps/api`'s `postgres-search-provider.ts` is the
only concrete `SearchProvider` implementation today, and
`search.service.ts` is where permission and tenant filtering are
actually enforced against real data.

## What's here

```
src/
  entities.ts              SEARCHABLE_ENTITIES — all 13 named in the
                          brief, each tagged with requiredPermission
                          and an optional quickActionLabel;
                          resolveSearchableEntities()
  provider.ts                   SearchProvider — a one-method interface
                          nothing outside a concrete implementation
                          ever needs to know the internals of
  ranking.ts                        mergeAndRankResults(), scoreMatch()
                          (exact > prefix > substring, 0-1 scale any
                          future provider's own relevance score needs
                          to produce)
  recent-searches.ts                    buildRecentSearchList() —
                          deduplicated, capped at 10
  validation.ts                            searchQuerySchema,
                          saveSearchSchema, naturalLanguageSearchSchema
  index.ts                                    barrel export
```

See [docs/global-search.md](../../docs/global-search.md) for the full
design — especially how permission and tenant filtering are enforced
*before* the provider is ever called, and how natural-language search
is a translation step in front of the same guarded pipeline, never a
separate one.

## Testing

```bash
pnpm --filter @bcp/search test
pnpm --filter @bcp/search typecheck
pnpm --filter @bcp/search lint
```
