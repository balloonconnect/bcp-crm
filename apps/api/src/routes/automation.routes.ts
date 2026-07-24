import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createRuleSchema, updateRuleSchema, createStepSchema, updateStepSchema, testRunSchema } from "@bcp/automation";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as rules from "../services/automation-rules.service";
import * as execution from "../services/automation-execution.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const ruleStepParamsSchema = z.object({ id: z.string().uuid(), stepId: z.string().uuid() });

export async function automationRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("workflow:manage")];
  const view = manage; // no separate workflow:view permission exists in the catalog — viewing automations requires the same access as managing them

  app.get("/automation/rules", { preHandler: view }, async (request) => {
    const query = z.object({ triggerType: z.string().optional(), isActive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await rules.listRules(request.auth!.studioId!, query) };
  });

  app.get("/automation/rules/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await rules.getRule(request.auth!.studioId!, id) };
  });

  app.post("/automation/rules", { preHandler: manage }, async (request) => {
    const body = createRuleSchema.parse(request.body);
    return { ok: true, data: await rules.createRule(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/automation/rules/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = updateRuleSchema.parse(request.body);
    return { ok: true, data: await rules.updateRule(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/automation/rules/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await rules.deleteRule(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  app.post("/automation/rules/:id/enable", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await rules.setRuleActive(request.auth!.studioId!, id, true, request.auth!.actorId) };
  });

  app.post("/automation/rules/:id/disable", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await rules.setRuleActive(request.auth!.studioId!, id, false, request.auth!.actorId) };
  });

  // ── Steps (visual editor persistence) ─────────────────────────────
  app.post("/automation/rules/:id/steps", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = createStepSchema.parse(request.body);
    return { ok: true, data: await rules.createStep(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/automation/rules/:id/steps/:stepId", { preHandler: manage }, async (request) => {
    const { id, stepId } = ruleStepParamsSchema.parse(request.params);
    const body = updateStepSchema.parse(request.body);
    return { ok: true, data: await rules.updateStep(request.auth!.studioId!, id, stepId, body, request.auth!.actorId) };
  });

  app.delete("/automation/rules/:id/steps/:stepId", { preHandler: manage }, async (request) => {
    const { id, stepId } = ruleStepParamsSchema.parse(request.params);
    await rules.deleteStep(request.auth!.studioId!, id, stepId, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Test mode + manual run ────────────────────────────────────────
  app.post("/automation/rules/:id/test-run", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = testRunSchema.parse(request.body);
    return { ok: true, data: await execution.runRule(request.auth!.studioId!, id, body.triggerContext, true, request.auth!.actorId) };
  });

  app.post("/automation/rules/:id/run", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = testRunSchema.parse(request.body);
    return { ok: true, data: await execution.runRule(request.auth!.studioId!, id, body.triggerContext, false, request.auth!.actorId) };
  });

  // ── Execution history ──────────────────────────────────────────────
  app.get("/automation/executions", { preHandler: view }, async (request) => {
    const { ruleId } = z.object({ ruleId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await rules.listExecutions(request.auth!.studioId!, ruleId) };
  });

  app.get("/automation/executions/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await rules.getExecution(request.auth!.studioId!, id) };
  });
}
