import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { whatsappConfigInputSchema, templateInputSchema, sendTextInputSchema, sendTemplateInputSchema, sendMediaInputSchema, previewTemplateInputSchema, optStatusInputSchema, previewTemplate } from "@bcp/whatsapp";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as whatsappConfig from "../services/whatsapp-config.service";
import * as whatsappSender from "../services/whatsapp-sender.service";
import * as whatsappMessages from "../services/whatsapp-messages.service";
import * as whatsappConsent from "../services/whatsapp-consent.service";
import * as whatsappWebhook from "../services/whatsapp-webhook.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function whatsappRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("whatsapp:manage")];
  const send = [app.authenticate, requireStudioPermission("whatsapp:send")];
  const view = [app.authenticate, requireStudioPermission("whatsapp:view")];

  // ── Studio configuration ─────────────────────────────────────────────
  app.get("/whatsapp/config", { preHandler: manage }, async (request) => ({ ok: true, data: await whatsappConfig.getWhatsAppConfig(request.auth!.studioId!) }));

  app.put("/whatsapp/config", { preHandler: manage }, async (request) => {
    const body = whatsappConfigInputSchema.parse(request.body);
    return { ok: true, data: await whatsappConfig.upsertWhatsAppConfig(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  // ── Approved templates ────────────────────────────────────────────────
  app.get("/whatsapp/templates", { preHandler: view }, async (request) => ({ ok: true, data: await whatsappConfig.listTemplates(request.auth!.studioId!) }));

  app.post("/whatsapp/templates", { preHandler: manage }, async (request) => {
    const body = templateInputSchema.parse(request.body);
    return { ok: true, data: await whatsappConfig.createTemplate(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/whatsapp/templates/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.enum(["pending", "approved", "rejected"]) }).parse(request.body);
    return { ok: true, data: await whatsappConfig.updateTemplateStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  // ── Template variable preview ────────────────────────────────────────
  app.post("/whatsapp/templates/:id/preview", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { variables } = z.object({ variables: z.array(z.string()).max(10) }).parse(request.body);
    return { ok: true, data: await whatsappConfig.previewTemplateById(request.auth!.studioId!, id, variables) };
  });

  app.post("/whatsapp/preview", { preHandler: view }, async (request) => {
    const body = previewTemplateInputSchema.parse(request.body);
    return { ok: true, data: { preview: previewTemplate(body.bodyText, body.variables) } };
  });

  // ── Sending ──────────────────────────────────────────────────────────
  app.post("/whatsapp/send/text", { preHandler: send }, async (request) => {
    const body = sendTextInputSchema.parse(request.body);
    return { ok: true, data: await whatsappSender.sendWhatsAppMessage(request.auth!.studioId!, { ...body, messageType: "text" }, request.auth!.actorId) };
  });

  app.post("/whatsapp/send/template", { preHandler: send }, async (request) => {
    const body = sendTemplateInputSchema.parse(request.body);
    return { ok: true, data: await whatsappSender.sendWhatsAppMessage(request.auth!.studioId!, { ...body, messageType: "template" }, request.auth!.actorId) };
  });

  app.post("/whatsapp/send/image", { preHandler: send }, async (request) => {
    const body = sendMediaInputSchema.parse(request.body);
    return { ok: true, data: await whatsappSender.sendWhatsAppMessage(request.auth!.studioId!, { ...body, messageType: "image" }, request.auth!.actorId) };
  });

  app.post("/whatsapp/send/document", { preHandler: send }, async (request) => {
    const body = sendMediaInputSchema.parse(request.body);
    return { ok: true, data: await whatsappSender.sendWhatsAppMessage(request.auth!.studioId!, { ...body, messageType: "document" }, request.auth!.actorId) };
  });

  app.post("/whatsapp/messages/:id/retry", { preHandler: send }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await whatsappSender.retryMessage(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Message log & usage ───────────────────────────────────────────────
  app.get("/whatsapp/messages", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), toPhone: z.string().optional(), contextType: z.string().optional(), contextId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await whatsappMessages.listMessages(request.auth!.studioId!, query) };
  });

  app.get("/whatsapp/messages/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await whatsappMessages.getMessage(request.auth!.studioId!, id) };
  });

  app.get("/whatsapp/usage", { preHandler: view }, async (request) => ({ ok: true, data: await whatsappMessages.getWhatsAppUsage(request.auth!.studioId!) }));

  // ── Opt-in / opt-out ─────────────────────────────────────────────────
  app.get("/whatsapp/opt-statuses", { preHandler: view }, async (request) => ({ ok: true, data: await whatsappConsent.listOptStatuses(request.auth!.studioId!) }));

  app.put("/whatsapp/opt-statuses", { preHandler: manage }, async (request) => {
    const body = optStatusInputSchema.parse(request.body);
    return { ok: true, data: await whatsappConsent.setOptStatus(request.auth!.studioId!, body.phone, body.status, request.auth!.actorId) };
  });

  // ── Webhook (public — Meta calls this directly, no studio session) ──
  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = z.object({ "hub.mode": z.string(), "hub.verify_token": z.string(), "hub.challenge": z.string() }).parse(request.query);
    const challenge = await whatsappWebhook.verifyWebhookChallenge(query["hub.mode"], query["hub.verify_token"], query["hub.challenge"]);
    if (!challenge) return reply.status(403).send({ ok: false });
    return reply.status(200).send(challenge);
  });

  app.post("/webhooks/whatsapp", async (request) => {
    const result = await whatsappWebhook.handleStatusWebhook(request.body as never);
    return { ok: true, data: result };
  });
}
