import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { submissionEnvelopeSchema, MAX_SUBMISSIONS_PER_IP_PER_HOUR } from "@bcp/enquiry-form";
import { toRouteRateLimit } from "../plugins/rate-limit-auth";
import * as publicEnquiry from "../services/enquiry-form-public.service";

const resolveQuerySchema = z.object({ studioSlug: z.string().optional() });
const submitParamsSchema = z.object({ formSlug: z.string() });

const submitRateLimit = toRouteRateLimit({ max: MAX_SUBMISSIONS_PER_IP_PER_HOUR, timeWindowSeconds: 60 * 60 });

/**
 * Fully public, unauthenticated routes — a public enquiry form has no
 * session to authenticate. Spam protection here is layered: a hard
 * `@fastify/rate-limit` cap (this file), plus the honeypot/fill-time/
 * velocity heuristic scoring inside `submitPublicEnquiry` itself (see
 * @bcp/enquiry-form's `checkForSpam`) — the rate limit stops abuse
 * outright, the heuristic still lets through-the-limit submissions get
 * flagged for review rather than silently trusted.
 */
export async function enquiryFormPublicRoutes(app: FastifyInstance) {
  app.get("/public/enquiry-forms/:formSlug", async (request, reply) => {
    const { formSlug } = submitParamsSchema.parse(request.params);
    const { studioSlug } = resolveQuerySchema.parse(request.query);
    try {
      const result = await publicEnquiry.resolvePublicForm({ hostname: request.hostname, studioSlug, formSlug });
      return { ok: true, data: result };
    } catch {
      return reply.status(404).send({ ok: false, error: { code: "ENQUIRY_FORM_NOT_FOUND", message: "This form isn't available" } });
    }
  });

  app.post(
    "/public/enquiry-forms/:formSlug/submit",
    { config: submitRateLimit },
    async (request, reply) => {
      const { formSlug } = submitParamsSchema.parse(request.params);
      const { studioSlug } = resolveQuerySchema.parse(request.query);
      const body = submissionEnvelopeSchema.parse(request.body);

      try {
        const result = await publicEnquiry.submitPublicEnquiry({
          formSlug,
          hostname: request.hostname,
          studioSlug,
          payload: body.payload,
          consentGiven: body.consentGiven,
          utm: body.utm,
          referrer: body.referrer,
          honeypotValue: body.website,
          msSinceRendered: body.renderedAt ? Date.now() - body.renderedAt : undefined,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        });
        return { ok: true, data: result };
      } catch (error) {
        if (error instanceof publicEnquiry.EnquiryFormPublicNotFoundError) {
          return reply.status(404).send({ ok: false, error: { code: error.code, message: error.message } });
        }
        if (error instanceof publicEnquiry.EnquiryFormSubmissionInvalidError) {
          return reply.status(422).send({ ok: false, error: { code: "ENQUIRY_FORM_SUBMISSION_INVALID", message: error.message, errors: error.errors } });
        }
        throw error;
      }
    },
  );
}
