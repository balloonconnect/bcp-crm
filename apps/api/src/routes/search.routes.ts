import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchQuerySchema, saveSearchSchema, naturalLanguageSearchSchema } from "@bcp/search";
import { loadStudioPermissionContext } from "../plugins/permission-context";
import * as search from "../services/search.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function searchRoutes(app: FastifyInstance) {
  const authed = [app.authenticate];

  app.post("/search", { preHandler: authed }, async (request, reply) => {
    const body = searchQuerySchema.parse(request.body);
    const context = await loadStudioPermissionContext(request.auth!);
    if (!context) return reply.status(403).send({ ok: false, error: { code: "NO_STUDIO_MEMBERSHIP", message: "No active studio membership" } });

    return { ok: true, data: await search.search(request.auth!.studioId!, request.auth!.actorId, body.query, context.permissions, body.entityTypes) };
  });

  app.post("/search/natural-language", { preHandler: authed }, async (request, reply) => {
    const body = naturalLanguageSearchSchema.parse(request.body);
    const context = await loadStudioPermissionContext(request.auth!);
    if (!context) return reply.status(403).send({ ok: false, error: { code: "NO_STUDIO_MEMBERSHIP", message: "No active studio membership" } });

    return { ok: true, data: await search.naturalLanguageSearch(request.auth!.studioId!, request.auth!.actorId, body.query, context.permissions) };
  });

  app.get("/search/recent", { preHandler: authed }, async (request) => ({ ok: true, data: await search.listRecentSearches(request.auth!.actorId) }));

  app.get("/search/saved", { preHandler: authed }, async (request) => ({ ok: true, data: await search.listSavedSearches(request.auth!.studioId!, request.auth!.actorId) }));

  app.post("/search/saved", { preHandler: authed }, async (request) => {
    const body = saveSearchSchema.parse(request.body);
    return { ok: true, data: await search.saveSearch(request.auth!.studioId!, request.auth!.actorId, body) };
  });

  app.delete("/search/saved/:id", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await search.deleteSavedSearch(request.auth!.studioId!, request.auth!.actorId, id);
    return { ok: true, data: null };
  });
}
