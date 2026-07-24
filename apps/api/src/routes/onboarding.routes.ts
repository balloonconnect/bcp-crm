import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import * as onboarding from "../services/onboarding.service";

const REFRESH_COOKIE = "bcp_refresh_token"; // same cookie the studio-auth login flow uses — onboarding hands off into a normal session

const startSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(10) });
const provisionSchema = z.object({ name: z.string().min(2), slug: z.string().min(2) });
const stepParamsSchema = z.object({ sessionId: z.string().uuid(), stepKey: z.string() });

function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(REFRESH_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/auth", expires: expiresAt });
}

export async function onboardingRoutes(app: FastifyInstance) {
  // Step 1 — owner account. No Studio exists yet, so no auth is possible.
  app.post("/onboarding/start", async (request) => {
    const body = startSchema.parse(request.body);
    const session = await onboarding.startOnboarding(body);
    return { ok: true, data: { sessionId: session.id, resumeToken: session.resumeToken } };
  });

  // Step 2 — studio name. Provisions the real Studio + owner account +
  // trial subscription + default branch, and immediately signs the owner
  // in (sets the refresh cookie) so every step after this is a normal
  // authenticated request.
  app.post("/onboarding/:sessionId/provision", async (request, reply) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = provisionSchema.parse(request.body);
    const result = await onboarding.provisionStudio(sessionId, body);
    if ("tokens" in result) {
      setRefreshCookie(reply, result.tokens.refreshToken, result.tokens.expiresAt);
      return { ok: true, data: { studio: result.studio, accessToken: result.tokens.accessToken } };
    }
    return { ok: true, data: { studio: null } };
  });

  // Generic settings-backed step (business info, GST, bank, UPI,
  // services, packages, payment gateway) — validates + persists +
  // completes in one call.
  app.post("/onboarding/:sessionId/steps/:stepKey/save", { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId, stepKey } = stepParamsSchema.parse(request.params);
    const updated = await onboarding.saveSettingsStep(
      sessionId,
      stepKey as never,
      request.body,
      request.auth!.actorId,
    );
    return { ok: true, data: updated };
  });

  // Marks a step done that was actually completed via its own feature
  // endpoint (branch, logo, brand colors, email/WhatsApp setup, team
  // invitation, customer import, custom domain, subscription).
  app.post("/onboarding/:sessionId/steps/:stepKey/complete", { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId, stepKey } = stepParamsSchema.parse(request.params);
    const updated = await onboarding.markStepDone(sessionId, stepKey as never);
    return { ok: true, data: updated };
  });

  app.post("/onboarding/:sessionId/steps/:stepKey/skip", { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId, stepKey } = stepParamsSchema.parse(request.params);
    const updated = await onboarding.skipStep(sessionId, stepKey as never);
    return { ok: true, data: updated };
  });

  app.post("/onboarding/:sessionId/sample-data", { preHandler: [app.authenticate] }, async (request) => {
    await onboarding.seedSampleData(request.auth!.studioId!, request.auth!.actorId);
    return { ok: true, data: null };
  });

  app.post("/onboarding/:sessionId/complete", { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const session = await onboarding.completeOnboarding(sessionId);
    return { ok: true, data: session };
  });

  // Resume — either by session id (bookmarked/localStorage) or by a
  // token from an emailed "continue setting up your studio" link.
  app.get("/onboarding/:sessionId", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const result = await onboarding.getSessionById(sessionId);
    return { ok: true, data: result };
  });

  app.get("/onboarding/resume/:resumeToken", async (request) => {
    const { resumeToken } = z.object({ resumeToken: z.string() }).parse(request.params);
    const result = await onboarding.getSessionByResumeToken(resumeToken);
    return { ok: true, data: result };
  });
}
