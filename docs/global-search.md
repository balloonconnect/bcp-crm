# Global Search and Command Menu

Cross-entity search across all 13 entities named in the brief, with a
keyboard-shortcut command menu, mobile full-screen mode, fuzzy
(substring) matching, recent and saved searches, permission and tenant
filtering, natural-language search, and quick actions. Built on the
same provider-abstraction pattern this codebase already established
for face recognition and storage: `@bcp/search` defines the interface,
`apps/api`'s `PostgresSearchProvider` is the only implementation today.

## PostgreSQL first, ready for Meilisearch or Elasticsearch later

`SearchProvider` is a one-method interface (`search(query): Promise<SearchResult[]>`).
Nothing in `search.service.ts`, the command menu, or anywhere else in
the calling code touches Prisma or a search engine's SDK directly —
only `postgres-search-provider.ts` does, and swapping in Meilisearch or
Elasticsearch later means writing one new class against the same
interface. The current implementation is deliberately honest about
what it does: `ILIKE` substring matching, described as "fuzzy" in the
sense of tolerating partial matches, not oversold as full typo-
tolerant `pg_trgm` similarity search this environment has no live
database to verify against.

## Permission filtering happens before the provider is ever called

`resolveSearchableEntities()` narrows the 13 entity types down to
whichever ones the acting user's own granted permissions allow —
before any query runs, not filtered out of results afterward. A
request can further narrow that set (searching just "clients"), but
can never widen past what permissions already allow.

## Tenant filtering is structural

`studioId` comes only from the authenticated request and is threaded
through to every entity query in `PostgresSearchProvider` — including
the natural-language path, where a free-text query is only ever
translated into a keyword and entity-type hint, never into anything
that could substitute a different studio's ID.

## Natural-language search is a translation step, not a separate pipeline

A request like "overdue invoices from last month" is interpreted by
Claude into a plain keyword plus likely entity types, then run through
the exact same permission- and tenant-filtered `search()` path every
other query uses — natural language is a friendlier front door onto
one guarded pipeline, never a second, less-guarded one.

## Recent and saved searches, both scoped per user

Not just per studio — one team member's search history is never shown
to a colleague, even within the same studio. Recent searches are
deduplicated and capped at 10 (`buildRecentSearchList()`); saved
searches snapshot both the query text and the entity types it was
scoped to, so reopening one later reproduces the same search exactly.

## Keyboard shortcut and mobile full-screen

The command menu is mounted once, globally, in the root layout —
Cmd/Ctrl+K opens it from any page, and a small visible trigger button
elsewhere in the UI dispatches the same open event rather than
duplicating the modal. On a narrow viewport it renders full-screen
rather than a centered dialog, a real breakpoint behavior rather than
a separate mobile-only component.

## Testing

```bash
pnpm --filter @bcp/search test   # entity registry, permission filtering, ranking, recent-search capping
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # command menu, Cmd+K, mobile full-screen
```
