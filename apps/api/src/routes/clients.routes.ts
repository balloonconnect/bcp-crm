import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { clientInputSchema, clientUpdateSchema, familyContactSchema, clientCommunicationSchema, contractSchema, feedbackSchema } from "@bcp/clients";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as clients from "../services/customers.service";
import * as subrecords from "../services/client-subrecords.service";
import * as fulfillment from "../services/fulfillment.service";
import * as clientTimeline from "../services/client-timeline.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const subIdParamsSchema = z.object({ id: z.string().uuid(), subId: z.string().uuid() });

export async function clientsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("client:view")];
  const manage = [app.authenticate, requireStudioPermission("client:manage")];

  // ── Profile CRUD ─────────────────────────────────────────────────────
  app.get("/clients", { preHandler: view }, async (request) => ({ ok: true, data: await clients.listClients(request.auth!.studioId!) }));

  app.get("/clients/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.getClient(request.auth!.studioId!, id) };
  });

  app.post("/clients", { preHandler: manage }, async (request) => {
    const body = clientInputSchema.parse(request.body);
    return { ok: true, data: await clients.createClient({ ...body, studioId: request.auth!.studioId!, actorId: request.auth!.actorId }) };
  });

  app.patch("/clients/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = clientUpdateSchema.parse(request.body);
    return { ok: true, data: await clients.updateClient(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Financials / score / AI / referrals ─────────────────────────────
  app.get("/clients/:id/financials", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.getClientFinancials(request.auth!.studioId!, id) };
  });

  app.get("/clients/:id/relationship-score", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.getClientRelationshipScore(request.auth!.studioId!, id) };
  });

  app.get("/clients/:id/ai-insights", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.getClientAiInsights(request.auth!.studioId!, id) };
  });

  app.get("/clients/:id/referrals", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.getReferralHistory(request.auth!.studioId!, id) };
  });

  // ── Timeline ─────────────────────────────────────────────────────────
  app.get("/clients/:id/timeline", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clientTimeline.getClientTimeline(request.auth!.studioId!, id) };
  });

  // ── Portal access ────────────────────────────────────────────────────
  app.post("/clients/:id/portal-access/enable", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await clients.enablePortalAccess(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/clients/:id/portal-access/disable", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await clients.disablePortalAccess(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Family contacts ──────────────────────────────────────────────────
  app.get("/clients/:id/family-contacts", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await subrecords.listFamilyContacts(request.auth!.studioId!, id) };
  });

  app.post("/clients/:id/family-contacts", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = familyContactSchema.parse(request.body);
    return { ok: true, data: await subrecords.addFamilyContact(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/clients/:id/family-contacts/:subId", { preHandler: manage }, async (request) => {
    const { subId } = subIdParamsSchema.parse(request.params);
    await subrecords.removeFamilyContact(request.auth!.studioId!, subId);
    return { ok: true, data: null };
  });

  // ── Communications ───────────────────────────────────────────────────
  app.get("/clients/:id/communications", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await subrecords.listClientCommunications(request.auth!.studioId!, id) };
  });

  app.post("/clients/:id/communications", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = clientCommunicationSchema.parse(request.body);
    return { ok: true, data: await subrecords.logClientCommunication(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Contracts ────────────────────────────────────────────────────────
  app.get("/clients/:id/contracts", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await subrecords.listContracts(request.auth!.studioId!, id) };
  });

  app.post("/clients/:id/contracts", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = contractSchema.parse(request.body);
    return { ok: true, data: await subrecords.createContract(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/clients/:id/contracts/:subId/status", { preHandler: manage }, async (request) => {
    const { subId } = subIdParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await subrecords.updateContractStatus(request.auth!.studioId!, subId, status, request.auth!.actorId) };
  });

  // ── Feedback ─────────────────────────────────────────────────────────
  app.get("/clients/:id/feedback", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await subrecords.listFeedback(request.auth!.studioId!, id) };
  });

  app.post("/clients/:id/feedback", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = feedbackSchema.parse(request.body);
    return { ok: true, data: await subrecords.addFeedback(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Deliveries (fulfillment) ──────────────────────────
  app.get("/deliveries", { preHandler: view }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await fulfillment.listDeliveries(request.auth!.studioId!, eventId) };
  });

  app.post("/deliveries", { preHandler: manage }, async (request) => {
    const body = z.object({ eventId: z.string().uuid(), method: z.string().optional(), trackingInfo: z.string().optional() }).parse(request.body);
    return { ok: true, data: await fulfillment.createDelivery(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/deliveries/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await fulfillment.updateDeliveryStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });
}
