import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { invoiceInputSchema, paymentInputSchema, creditNoteInputSchema, refundReceiptInputSchema } from "@bcp/invoicing";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as invoices from "../services/invoices.service";
import * as invoiceDocuments from "../services/invoice-documents.service";
import * as invoicePdf from "../services/invoice-pdf.service";
import * as invoiceDistribution from "../services/invoice-distribution.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function invoicingRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("invoice:view")];
  const manage = [app.authenticate, requireStudioPermission("invoice:manage")];
  const recordPaymentAccess = [app.authenticate, requireStudioPermission("payment:record")];

  // ── Invoices ─────────────────────────────────────────────────────────
  app.get("/invoices", { preHandler: view }, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await invoices.listInvoices(request.auth!.studioId!, { status }) };
  });

  app.get("/invoices/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoices.getInvoice(request.auth!.studioId!, id) };
  });

  app.get("/invoices/:id/outstanding", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoices.getInvoiceOutstanding(request.auth!.studioId!, id) };
  });

  app.post("/invoices", { preHandler: manage }, async (request) => {
    const body = invoiceInputSchema.parse(request.body);
    return { ok: true, data: await invoices.createInvoice(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/invoices/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await invoices.updateInvoiceStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.get("/invoices/:id/pdf", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const invoice = await invoices.getInvoice(request.auth!.studioId!, id);
    const pdf = await invoicePdf.generateInvoicePdf(request.auth!.studioId!, id);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${invoice.invoiceNumber.replace(/\//g, "-")}.pdf"`);
    return reply.send(pdf);
  });

  app.post("/invoices/:id/send/email", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoiceDistribution.sendInvoiceEmail(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/invoices/:id/send/whatsapp", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoiceDistribution.sendInvoiceWhatsApp(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/invoices/:id/send/reminder", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoiceDistribution.sendPaymentReminder(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Payments (every payment auto-generates a receipt) ────────────────
  app.post("/invoices/:id/payments", { preHandler: recordPaymentAccess }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = paymentInputSchema.parse(request.body);
    return { ok: true, data: await invoices.recordPayment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/payments/:id/receipt/pdf", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const pdf = await invoicePdf.generateReceiptPdf(request.auth!.studioId!, id);
    reply.header("Content-Type", "application/pdf");
    return reply.send(pdf);
  });

  // ── Credit notes ─────────────────────────────────────────────────────
  app.get("/credit-notes", { preHandler: view }, async (request) => {
    const { invoiceId } = z.object({ invoiceId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await invoiceDocuments.listCreditNotes(request.auth!.studioId!, invoiceId) };
  });

  app.post("/invoices/:id/credit-notes", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = creditNoteInputSchema.parse(request.body);
    return { ok: true, data: await invoiceDocuments.createCreditNote(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.post("/credit-notes/:id/apply", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await invoiceDocuments.applyCreditNote(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Refund receipts ──────────────────────────────────────────────────
  app.get("/refund-receipts", { preHandler: view }, async (request) => ({ ok: true, data: await invoiceDocuments.listRefundReceipts(request.auth!.studioId!) }));

  app.post("/refund-receipts", { preHandler: manage }, async (request) => {
    const body = refundReceiptInputSchema.parse(request.body);
    return { ok: true, data: await invoiceDocuments.createRefundReceipt(request.auth!.studioId!, body, request.auth!.actorId) };
  });
}
