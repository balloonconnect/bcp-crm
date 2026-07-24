import { prisma } from "@bcp/database";
import { AiClient } from "@bcp/ai";
import { resolveSearchableEntities, mergeAndRankResults, buildRecentSearchList, SEARCHABLE_ENTITIES } from "@bcp/search";
import { getEnv } from "@bcp/config";
import { PostgresSearchProvider } from "./postgres-search-provider";

const RESULT_LIMIT = 20;
const provider = new PostgresSearchProvider(); // the one place a concrete SearchProvider is chosen — swapping providers later means changing only this line

let aiClient: AiClient | null | undefined;
function getAiClient(): AiClient | null {
  if (aiClient !== undefined) return aiClient;
  const env = getEnv();
  aiClient = env.ANTHROPIC_API_KEY ? new AiClient({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  return aiClient;
}

/**
 * "Tenant filtering" is structural here, the same way it is
 * everywhere else in this codebase: `studioId` comes only from the
 * authenticated request, is passed through to every entity query in
 * `PostgresSearchProvider`, and there is no code path — natural-
 * language interpretation included — where a search query's own text
 * could substitute a different studio's ID. "Permission filtering"
 * happens before the provider is ever called: `entityTypes` is
 * resolved from the user's own granted permissions
 * (`resolveSearchableEntities()`), then optionally narrowed further by
 * whatever the caller explicitly requested — never widened past what
 * permissions already allow.
 */
export async function search(studioId: string, userId: string, query: string, grantedPermissions: string[], requestedEntityTypes: string[] | undefined) {
  const permittedEntities = resolveSearchableEntities(grantedPermissions);
  const entityTypes = requestedEntityTypes ? requestedEntityTypes.filter((t) => permittedEntities.includes(t as never)) : permittedEntities;

  const results = entityTypes.length > 0 ? await provider.search({ studioId, query, entityTypes, limit: RESULT_LIMIT }) : [];
  const ranked = mergeAndRankResults([results], RESULT_LIMIT);

  await recordRecentSearch(studioId, userId, query);

  const quickActions = SEARCHABLE_ENTITIES.filter((e) => e.quickActionLabel && permittedEntities.includes(e.key)).map((e) => ({ label: e.quickActionLabel!, entityType: e.key }));

  return { results: ranked, quickActions };
}

async function recordRecentSearch(studioId: string, userId: string, query: string) {
  const existing = await prisma.recentSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { query: true } });
  const nextList = buildRecentSearchList(existing.map((e: { query: string }) => e.query), query);

  await prisma.$transaction([
    prisma.recentSearch.deleteMany({ where: { userId } }),
    prisma.recentSearch.createMany({ data: nextList.map((q) => ({ studioId, userId, query: q })) }),
  ]);
}

export async function listRecentSearches(userId: string) {
  const rows = await prisma.recentSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { query: true } });
  return rows.map((r: { query: string }) => r.query);
}

// ── Saved searches ───────────────────────────────────────────────────

export async function listSavedSearches(studioId: string, userId: string) {
  return prisma.savedSearch.findMany({ where: { studioId, userId }, orderBy: { createdAt: "desc" } });
}

export async function saveSearch(studioId: string, userId: string, input: { name: string; query: string; entityTypes?: string[] }) {
  return prisma.savedSearch.create({ data: { studioId, userId, name: input.name, query: input.query, entityTypes: input.entityTypes ?? [] } });
}

export async function deleteSavedSearch(studioId: string, userId: string, savedSearchId: string) {
  await prisma.savedSearch.deleteMany({ where: { id: savedSearchId, studioId, userId } });
}

/**
 * "Natural-language search" — interprets a free-text request (e.g.
 * "overdue invoices from last month" or "wedding leads in Chennai")
 * into a plain keyword plus the entity types it's actually about,
 * which is then run through the exact same `search()` path above —
 * natural-language input is a translation step in front of the same
 * permission- and tenant-filtered pipeline, never a separate,
 * less-guarded one.
 */
export async function naturalLanguageSearch(studioId: string, userId: string, nlQuery: string, grantedPermissions: string[]) {
  const client = getAiClient();
  if (!client) throw new Error("Natural-language search isn't configured for this environment yet.");

  const entityKeys = SEARCHABLE_ENTITIES.map((e) => e.key).join(", ");
  const prompt = `A user searched: "${nlQuery}"\n\nExtract a short plain keyword phrase (2-5 words, no filler words) to search for, and which of these entity types it's most likely about: ${entityKeys}.\n\nRespond only with JSON: {"keyword": "...", "entityTypes": ["..."]}`;

  const response = await client.complete(prompt, 200);
  let parsed: { keyword?: string; entityTypes?: string[] };
  try {
    parsed = JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    parsed = { keyword: nlQuery, entityTypes: undefined };
  }

  return search(studioId, userId, parsed.keyword || nlQuery, grantedPermissions, parsed.entityTypes);
}
