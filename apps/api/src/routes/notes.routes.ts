import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as notes from "../services/notes.service";

const createNoteSchema = z.object({ entityType: z.string().min(1).max(50), entityId: z.string().uuid(), content: z.string().min(1).max(5000) });

export async function notesRoutes(app: FastifyInstance) {
  const authed = [app.authenticate, requireStudioPermission("studio:manage")];

  app.get("/notes", { preHandler: authed }, async (request) => {
    const { entityType, entityId } = z.object({ entityType: z.string(), entityId: z.string().uuid() }).parse(request.query);
    return { ok: true, data: await notes.listNotes(request.auth!.studioId!, entityType, entityId) };
  });

  app.post("/notes", { preHandler: authed }, async (request) => {
    const body = createNoteSchema.parse(request.body);
    return { ok: true, data: await notes.createNote(request.auth!.studioId!, body, request.auth!.actorId) };
  });
}
