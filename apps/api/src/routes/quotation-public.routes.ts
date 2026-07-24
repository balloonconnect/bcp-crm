import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { otpRequestSchema, otpVerifySchema, approvalSchema } from "@bcp/quotations";
import { toRouteRateLimit } from "../plugins/rate-limit-auth";
import { prisma } from "@bcp/database";
import * as publicQuotations from "../services/quotation-public.service";
import { generateQuotationPdf } from "../services/quotation-pdf.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });
const otpRateLimit = toRouteRateLimit({ max: 5, timeWindowSeconds: 60 * 60 });
const approvalRateLimit = toRouteRateLimit({ max: 10, timeWindowSeconds: 60 * 60 });

/**
 * Fully public, unauthenticated routes for the quotation share link —
 * mirrors the enquiry form's public-route shape (rate-limited,
 * IP/timestamp-audited, resolved by an opaque token rather than a
 * session). See docs/quotation-management.md for the OTP-gating design.
 */
export async function quotationPublicRoutes(app: FastifyInstance) {
  app.get("/public/quotations/:token", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    try {
      await publicQuotations.recordQuotationView(token, request.ip, request.headers["user-agent"] ?? null);
      const result = await publicQuotations.resolvePublicQuotation(token);
      return { ok: true, data: result };
    } catch {
      return reply.status(404).send({ ok: false, error: { code: "QUOTATION_NOT_FOUND", message: "This quotation isn't available" } });
    }
  });

  app.get("/public/quotations/:token/pdf", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const quotation = await prisma.quotation.findUnique({ where: { publicToken: token }, select: { id: true, studioId: true, quotationNumber: true } });
    if (!quotation) return reply.status(404).send({ ok: false, error: { code: "QUOTATION_NOT_FOUND", message: "This quotation isn't available" } });

    const pdfBuffer = await generateQuotationPdf(quotation.studioId, quotation.id);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${quotation.quotationNumber}.pdf"`);
    return reply.send(pdfBuffer);
  });

  app.post("/public/quotations/:token/otp/request", { config: otpRateLimit }, async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { target } = otpRequestSchema.parse(request.body);
    try {
      await publicQuotations.requestQuotationOtp(token, target, request.ip);
      return { ok: true, data: null };
    } catch {
      return reply.status(404).send({ ok: false, error: { code: "QUOTATION_NOT_FOUND", message: "This quotation isn't available" } });
    }
  });

  app.post("/public/quotations/:token/otp/verify", { config: otpRateLimit }, async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { target, code } = otpVerifySchema.parse(request.body);
    try {
      const result = await publicQuotations.verifyQuotationOtp(token, target, code);
      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof publicQuotations.QuotationOtpInvalidError) {
        return reply.status(422).send({ ok: false, error: { code: error.code, message: error.message } });
      }
      return reply.status(404).send({ ok: false, error: { code: "QUOTATION_NOT_FOUND", message: "This quotation isn't available" } });
    }
  });

  app.post("/public/quotations/:token/approve", { config: approvalRateLimit }, async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = approvalSchema.parse(request.body);
    const { otpVerified } = z.object({ otpVerified: z.boolean().default(false) }).parse(request.body);

    try {
      const result = await publicQuotations.approveQuotation({
        token,
        action: body.action,
        signedByName: body.signedByName,
        rejectionReason: body.rejectionReason,
        otpVerified,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      });
      return { ok: true, data: result };
    } catch {
      return reply.status(404).send({ ok: false, error: { code: "QUOTATION_NOT_FOUND", message: "This quotation isn't available" } });
    }
  });
}
