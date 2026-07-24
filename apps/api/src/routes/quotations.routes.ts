import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { quotationInputSchema, quotationUpdateSchema, quotationStatusChangeSchema } from "@bcp/quotations";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as quotations from "../services/quotations.service";
import * as pdf from "../services/quotation-pdf.service";
import * as distribution from "../services/quotation-distribution.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function quotationsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("quotation:view")];
  const manage = [app.authenticate, requireStudioPermission("quotation:manage")];

  app.get("/quotations", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), clientId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await quotations.listQuotations(request.auth!.studioId!, query) };
  });

  app.get("/quotations/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.getQuotation(request.auth!.studioId!, id) };
  });

  app.get("/quotations/:id/customer-view", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.getCustomerFacingQuotationView(request.auth!.studioId!, id) };
  });

  // Studio-only — never reachable from a customer-facing surface.
  app.get("/quotations/:id/margin", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.getQuotationMargin(request.auth!.studioId!, id) };
  });

  app.get("/quotations/:id/revisions", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.listRevisions(request.auth!.studioId!, id) };
  });

  app.get("/quotations/:id/views", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.listQuotationViews(request.auth!.studioId!, id) };
  });

  app.post("/quotations", { preHandler: manage }, async (request) => {
    const body = quotationInputSchema.parse(request.body);
    return { ok: true, data: await quotations.createQuotation(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/quotations/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = quotationUpdateSchema.parse(request.body);
    return { ok: true, data: await quotations.updateQuotation(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/quotations/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = quotationStatusChangeSchema.parse(request.body);
    return { ok: true, data: await quotations.changeQuotationStatus(request.auth!.studioId!, id, status as never, request.auth!.actorId) };
  });

  app.post("/quotations/:id/clone", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.cloneQuotation(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/quotations/:id/convert", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await quotations.convertQuotationToBooking(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.get("/quotations/:id/pdf", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const quotation = await quotations.getQuotation(request.auth!.studioId!, id);
    const pdfBuffer = await pdf.generateQuotationPdf(request.auth!.studioId!, id);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${quotation.quotationNumber}.pdf"`);
    return reply.send(pdfBuffer);
  });

  app.post("/quotations/:id/send/email", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await distribution.sendQuotationEmail(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/quotations/:id/send/whatsapp", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await distribution.sendQuotationWhatsApp(request.auth!.studioId!, id, request.auth!.actorId) };
  });
}
