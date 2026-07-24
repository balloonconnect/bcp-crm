import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@bcp/database";
import * as portalAuth from "../services/client-portal-auth.service";
import * as portal from "../services/client-portal.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

async function resolvePortal(request: FastifyRequest) {
  const header = request.headers.authorization;
  const sessionToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!sessionToken) throw new portalAuth.PortalSessionExpiredError();
  return portalAuth.resolvePortalSession(sessionToken);
}

export async function clientPortalRoutes(app: FastifyInstance) {
  // ── Login (studio-scoped by slug, since a client identifies which studio's portal they're logging into) ──
  app.post("/portal/:studioSlug/login/request", async (request, reply) => {
    const { studioSlug } = z.object({ studioSlug: z.string() }).parse(request.params);
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const studio = await prisma.studio.findUnique({ where: { slug: studioSlug } });
    if (!studio) return reply.status(404).send({ ok: false, error: { code: "STUDIO_NOT_FOUND", message: "Studio not found" } });
    return { ok: true, data: await portalAuth.requestPortalLogin(studio.id, email) };
  });

  app.post("/portal/login/verify", async (request) => {
    const { sessionToken, code } = z.object({ sessionToken: z.string(), code: z.string().length(6) }).parse(request.body);
    return { ok: true, data: await portalAuth.verifyPortalLogin(sessionToken, code) };
  });

  app.post("/portal/logout", async (request) => {
    const header = request.headers.authorization;
    const sessionToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (sessionToken) await portalAuth.logoutPortalSession(sessionToken);
    return { ok: true, data: null };
  });

  // ── Authenticated portal data ────────────────────────────────────────
  app.get("/portal/dashboard", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.getDashboardSummary(studioId, clientId) };
  });

  app.get("/portal/profile", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.getProfile(studioId, clientId) };
  });

  app.get("/portal/bookings", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listBookings(studioId, clientId) };
  });

  app.get("/portal/events", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listEvents(studioId, clientId) };
  });

  app.get("/portal/quotations", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listQuotations(studioId, clientId) };
  });

  app.get("/portal/quotations/:id", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await portal.getQuotationForClient(studioId, clientId, id) };
  });

  app.post("/portal/quotations/:id/accept", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await portal.acceptQuotation(studioId, clientId, id) };
  });

  app.get("/portal/contracts", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listContracts(studioId, clientId) };
  });

  app.post("/portal/contracts/:id/sign", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { id } = idParamsSchema.parse(request.params);
    const { signedByName } = z.object({ signedByName: z.string().min(1).max(200) }).parse(request.body);
    return { ok: true, data: await portal.signContract(studioId, clientId, id, signedByName) };
  });

  app.get("/portal/invoices", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listInvoices(studioId, clientId) };
  });

  app.post("/portal/invoices/:id/payment", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { id } = idParamsSchema.parse(request.params);
    const body = z.object({ amount: z.number().int().positive(), method: z.string().optional(), notes: z.string().max(1000).optional() }).parse(request.body);
    return { ok: true, data: await portal.makePayment(studioId, clientId, id, body) };
  });

  app.get("/portal/receipts", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listReceipts(studioId, clientId) };
  });

  app.get("/portal/galleries", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listGalleries(studioId, clientId) };
  });

  app.get("/portal/albums", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listAlbums(studioId, clientId) };
  });

  app.get("/portal/support-requests", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    return { ok: true, data: await portal.listSupportRequests(studioId, clientId) };
  });

  app.post("/portal/support-requests", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { subject, message } = z.object({ subject: z.string().min(1).max(200), message: z.string().min(1).max(2000) }).parse(request.body);
    return { ok: true, data: await portal.createSupportRequest(studioId, clientId, subject, message) };
  });

  app.post("/portal/support-requests/:id/reply", async (request) => {
    const { studioId, clientId } = await resolvePortal(request);
    const { id } = idParamsSchema.parse(request.params);
    const { body } = z.object({ body: z.string().min(1).max(2000) }).parse(request.body);
    return { ok: true, data: await portal.addSupportRequestReply(studioId, clientId, id, body) };
  });
}
