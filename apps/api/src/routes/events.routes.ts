import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eventInputSchema, eventUpdateSchema, shotListItemSchema, scheduleItemSchema } from "@bcp/events";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as events from "../services/events.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const subIdParamsSchema = z.object({ id: z.string().uuid(), subId: z.string().uuid() });

export async function eventsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("shoot:view")];
  const manage = [app.authenticate, requireStudioPermission("shoot:manage")];

  // ── Events ───────────────────────────────────────────────────────────
  app.get("/events", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional() }).parse(request.query);
    return { ok: true, data: await events.listEvents(request.auth!.studioId!, { status: query.status, from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined }) };
  });

  app.get("/events/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await events.getEvent(request.auth!.studioId!, id) };
  });

  app.post("/events/check-conflicts", { preHandler: view }, async (request) => {
    const body = z
      .object({
        scheduledAt: z.string().datetime(),
        endAt: z.string().datetime().optional(),
        venue: z.string().optional(),
        assignedUserIds: z.array(z.string().uuid()).optional(),
        equipment: z.array(z.object({ equipmentId: z.string().uuid(), quantity: z.number().int().positive() })).optional(),
        excludeEventId: z.string().uuid().optional(),
      })
      .parse(request.body);
    return { ok: true, data: await events.checkEventConflicts(request.auth!.studioId!, body, body.excludeEventId) };
  });

  app.post("/events", { preHandler: manage }, async (request) => {
    const body = eventInputSchema.parse(request.body);
    return { ok: true, data: await events.createEvent(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/events/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = eventUpdateSchema.parse(request.body);
    return { ok: true, data: await events.updateEvent(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/events/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await events.updateEventStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.patch("/events/:id/editing-status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { editingStatus } = z.object({ editingStatus: z.string() }).parse(request.body);
    return { ok: true, data: await events.updateEditingStatus(request.auth!.studioId!, id, editingStatus, request.auth!.actorId) };
  });

  // ── Shot list ────────────────────────────────────────────────────────
  app.post("/events/:id/shot-list", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { description } = shotListItemSchema.parse(request.body);
    return { ok: true, data: await events.addShotListItem(request.auth!.studioId!, id, description, request.auth!.actorId) };
  });

  app.patch("/events/:id/shot-list/:subId", { preHandler: manage }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    const { completed } = z.object({ completed: z.boolean() }).parse(request.body);
    return { ok: true, data: await events.toggleShotListItem(request.auth!.studioId!, id, subId, completed) };
  });

  app.delete("/events/:id/shot-list/:subId", { preHandler: manage }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    await events.removeShotListItem(request.auth!.studioId!, id, subId);
    return { ok: true, data: null };
  });

  // ── Intra-day schedule ───────────────────────────────────────────────
  app.post("/events/:id/schedule", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = scheduleItemSchema.parse(request.body);
    return { ok: true, data: await events.addScheduleItem(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/events/:id/schedule/:subId", { preHandler: manage }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    await events.removeScheduleItem(request.auth!.studioId!, id, subId);
    return { ok: true, data: null };
  });
}
