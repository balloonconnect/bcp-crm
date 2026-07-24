import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { emailConfigInputSchema, emailTemplateInputSchema, sendEmailInputSchema, previewTemplateInputSchema, renderEmailTemplate } from "@bcp/email";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as emailConfig from "../services/email-config.service";
import * as emailSender from "../services/email-sender.service";
import { prisma } from "@bcp/database";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function emailRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("email:manage")];
  const send = [app.authenticate, requireStudioPermission("email:send")];
  const view = [app.authenticate, requireStudioPermission("email:view")];

  // ── Studio configuration ─────────────────────────────────────────────
  app.get("/email/config", { preHandler: manage }, async (request) => ({ ok: true, data: await emailConfig.getEmailConfig(request.auth!.studioId!) }));

  app.put("/email/config", { preHandler: manage }, async (request) => {
    const body = emailConfigInputSchema.parse(request.body);
    return { ok: true, data: await emailConfig.upsertEmailConfig(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  // ── Templates ────────────────────────────────────────────────────────
  app.get("/email/templates", { preHandler: view }, async (request) => ({ ok: true, data: await emailConfig.listEmailTemplates(request.auth!.studioId!) }));

  app.post("/email/templates", { preHandler: manage }, async (request) => {
    const body = emailTemplateInputSchema.parse(request.body);
    return { ok: true, data: await emailConfig.createEmailTemplate(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/email/templates/:id/preview", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { variables } = z.object({ variables: z.record(z.string()) }).parse(request.body);
    return { ok: true, data: await emailConfig.previewEmailTemplateById(request.auth!.studioId!, id, variables) };
  });

  app.post("/email/preview", { preHandler: view }, async (request) => {
    const body = previewTemplateInputSchema.parse(request.body);
    return { ok: true, data: { preview: renderEmailTemplate(body.bodyHtml, body.variables) } };
  });

  // ── Sending ──────────────────────────────────────────────────────────
  app.post("/email/send", { preHandler: send }, async (request) => {
    const body = sendEmailInputSchema.parse(request.body);
    return { ok: true, data: await emailSender.sendEmail(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/email/messages/:id/retry", { preHandler: send }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await emailSender.retryEmail(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Communication history ────────────────────────────────────────────
  app.get("/email/messages", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), toAddress: z.string().optional() }).parse(request.query);
    return {
      ok: true,
      data: await prisma.emailMessage.findMany({ where: { studioId: request.auth!.studioId!, ...(query.status ? { status: query.status as never } : {}), ...(query.toAddress ? { toAddress: query.toAddress } : {}) }, orderBy: { queuedAt: "desc" }, take: 200 }),
    };
  });

  // ── Unsubscribe ──────────────────────────────────────────────────────
  app.get("/email/unsubscribes", { preHandler: view }, async (request) => ({ ok: true, data: await prisma.emailUnsubscribe.findMany({ where: { studioId: request.auth!.studioId! } }) }));

  app.post("/email/unsubscribe", { preHandler: manage }, async (request) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const record = await prisma.emailUnsubscribe.upsert({ where: { studioId_email: { studioId: request.auth!.studioId!, email } }, update: {}, create: { studioId: request.auth!.studioId!, email } });
    return { ok: true, data: record };
  });

  // Public, unauthenticated unsubscribe link target — a recipient clicking "unsubscribe" in an email shouldn't need to log in.
  app.get("/public/email/unsubscribe", async (request, reply) => {
    const { studioId, email } = z.object({ studioId: z.string().uuid(), email: z.string().email() }).parse(request.query);
    await prisma.emailUnsubscribe.upsert({ where: { studioId_email: { studioId, email } }, update: {}, create: { studioId, email } });
    return reply.status(200).send({ ok: true, message: "You have been unsubscribed." });
  });
}
