import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateContentSchema, brandVoiceSettingsSchema, saveBrandExampleSchema, approveRequestSchema } from "@bcp/marketing";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as marketing from "../services/marketing-content.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function marketingContentRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("email:manage")];
  const view = [app.authenticate, requireStudioPermission("email:view")];

  app.post("/marketing/generate", { preHandler: manage }, async (request) => {
    const body = generateContentSchema.parse(request.body);
    return { ok: true, data: await marketing.generateContent(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/marketing/requests/:id/regenerate", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await marketing.regenerateContent(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.get("/marketing/requests", { preHandler: view }, async (request) => {
    const { contentType } = z.object({ contentType: z.string().optional() }).parse(request.query);
    return { ok: true, data: await marketing.listRequests(request.auth!.studioId!, contentType) };
  });

  app.patch("/marketing/requests/:id/approve", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = approveRequestSchema.parse(request.body);
    return { ok: true, data: await marketing.approveRequest(request.auth!.studioId!, id, body.isApproved, request.auth!.actorId) };
  });

  app.get("/marketing/brand-voice", { preHandler: view }, async (request) => ({ ok: true, data: await marketing.getBrandVoiceSettings(request.auth!.studioId!) }));

  app.patch("/marketing/brand-voice", { preHandler: manage }, async (request) => {
    const body = brandVoiceSettingsSchema.parse(request.body);
    return { ok: true, data: await marketing.updateBrandVoiceSettings(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.get("/marketing/brand-examples", { preHandler: view }, async (request) => {
    const { contentType } = z.object({ contentType: z.string().optional() }).parse(request.query);
    return { ok: true, data: await marketing.listBrandExamples(request.auth!.studioId!, contentType) };
  });

  app.post("/marketing/brand-examples", { preHandler: manage }, async (request) => {
    const body = saveBrandExampleSchema.parse(request.body);
    return { ok: true, data: await marketing.saveBrandExample(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.delete("/marketing/brand-examples/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await marketing.deleteBrandExample(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });
}
