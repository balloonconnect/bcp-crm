import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { contractTemplateInputSchema, contractTemplateUpdateSchema, createContractSchema, updateContractContentSchema } from "@bcp/contracts";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as templates from "../services/contract-templates.service";
import * as contracts from "../services/contracts.service";
import * as signingPublic from "../services/contract-signing-public.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function contractsRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("client:manage")];
  const view = [app.authenticate, requireStudioPermission("client:view")];

  // ── Templates ("Allow each studio to manage its own templates") ──────
  app.get("/contract-templates", { preHandler: view }, async (request) => ({ ok: true, data: await templates.listTemplates(request.auth!.studioId!) }));

  app.get("/contract-templates/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await templates.getTemplate(request.auth!.studioId!, id) };
  });

  app.post("/contract-templates", { preHandler: manage }, async (request) => {
    const body = contractTemplateInputSchema.parse(request.body);
    return { ok: true, data: await templates.createTemplate(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/contract-templates/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = contractTemplateUpdateSchema.parse(request.body);
    return { ok: true, data: await templates.updateTemplate(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/contract-templates/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await templates.deleteTemplate(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Contracts ────────────────────────────────────────────────────────
  app.get("/contracts", { preHandler: view }, async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await contracts.listContracts(request.auth!.studioId!, clientId) };
  });

  app.get("/contracts/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await contracts.getContract(request.auth!.studioId!, id) };
  });

  app.post("/contracts", { preHandler: manage }, async (request) => {
    const body = createContractSchema.extend({ clientId: z.string().uuid() }).parse(request.body);
    return { ok: true, data: await contracts.createContract(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/contracts/:id/content", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = updateContractContentSchema.parse(request.body);
    return { ok: true, data: await contracts.updateContractContent(request.auth!.studioId!, id, body.bodyHtml, body.variableValues, request.auth!.actorId) };
  });

  app.post("/contracts/:id/send", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await contracts.sendContract(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/contracts/:id/void", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await contracts.voidContract(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.get("/contracts/:id/certificate", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const url = await signingPublic.getCertificateUrl(request.auth!.studioId!, id);
    return reply.redirect(url);
  });
}
