import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { leadInputSchema, leadUpdateSchema, leadStatusChangeSchema, leadNoteSchema, leadCommunicationSchema, bulkAssignSchema, bulkStatusSchema } from "@bcp/leads";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as leads from "../services/leads.service";
import * as leadNotes from "../services/lead-notes.service";
import * as leadAttachments from "../services/lead-attachments.service";
import * as leadCommunications from "../services/lead-communications.service";
import * as leadTimeline from "../services/lead-timeline.service";
import * as leadAi from "../services/lead-ai.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const listQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
const duplicateCheckSchema = z.object({
  phone: z.string().optional(),
  alternateMobile: z.string().optional(),
  email: z.string().optional(),
  instagramProfile1: z.string().optional(),
  instagramProfile2: z.string().optional(),
});

export async function leadsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("lead:view")];
  const manage = [app.authenticate, requireStudioPermission("lead:manage")];

  // ── List / detail ────────────────────────────────────────────────────
  app.get("/leads", { preHandler: view }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const data = await leads.listLeads(request.auth!.studioId!, {
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { ok: true, data };
  });

  app.get("/leads/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leads.getLead(request.auth!.studioId!, id) };
  });

  // ── Duplicate detection ──────────────────────────────────────────────
  app.post("/leads/check-duplicates", { preHandler: view }, async (request) => {
    const body = duplicateCheckSchema.parse(request.body);
    return { ok: true, data: await leads.checkForDuplicates(request.auth!.studioId!, body) };
  });

  // ── Create / update ──────────────────────────────────────────────────
  app.post("/leads", { preHandler: manage }, async (request) => {
    const body = leadInputSchema.parse(request.body);
    return { ok: true, data: await leads.createLead(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/leads/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = leadUpdateSchema.parse(request.body);
    return { ok: true, data: await leads.updateLead(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/leads/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = leadStatusChangeSchema.parse(request.body);
    return { ok: true, data: await leads.updateLeadStatus(request.auth!.studioId!, id, body.status, request.auth!.actorId, body.lostReason) };
  });

  app.post("/leads/:id/convert", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leads.convertLeadToClient(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Bulk actions ─────────────────────────────────────────────────────
  app.post("/leads/bulk/assign", { preHandler: manage }, async (request) => {
    const body = bulkAssignSchema.parse(request.body);
    return { ok: true, data: await leads.bulkAssign(request.auth!.studioId!, body.leadIds, body.assignedTo, request.auth!.actorId) };
  });

  app.post("/leads/bulk/status", { preHandler: manage }, async (request) => {
    const body = bulkStatusSchema.parse(request.body);
    return { ok: true, data: await leads.bulkUpdateStatus(request.auth!.studioId!, body.leadIds, body.status, request.auth!.actorId) };
  });

  // ── Notes ────────────────────────────────────────────────────────────
  app.get("/leads/:id/notes", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadNotes.listLeadNotes(request.auth!.studioId!, id) };
  });

  app.post("/leads/:id/notes", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { body: noteBody } = leadNoteSchema.parse(request.body);
    return { ok: true, data: await leadNotes.addLeadNote(request.auth!.studioId!, id, noteBody, request.auth!.actorId) };
  });

  // ── Communication history ────────────────────────────────────────────
  app.get("/leads/:id/communications", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadCommunications.listLeadCommunications(request.auth!.studioId!, id) };
  });

  app.post("/leads/:id/communications", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = leadCommunicationSchema.parse(request.body);
    return { ok: true, data: await leadCommunications.logLeadCommunication(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Attachments ──────────────────────────────────────────────────────
  app.get("/leads/:id/attachments", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadAttachments.listLeadAttachments(request.auth!.studioId!, id) };
  });

  app.post("/leads/:id/attachments", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const file = await request.file();
    if (!file) return { ok: false, error: { code: "NO_FILE", message: "No file uploaded" } };
    const body = await file.toBuffer();
    const attachment = await leadAttachments.uploadLeadAttachment({
      studioId: request.auth!.studioId!,
      leadId: id,
      fileName: file.filename,
      mimeType: file.mimetype,
      body,
      actorId: request.auth!.actorId,
    });
    return { ok: true, data: attachment };
  });

  app.delete("/leads/:id/attachments/:attachmentId", { preHandler: manage }, async (request) => {
    const { id, attachmentId } = z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() }).parse(request.params);
    await leadAttachments.deleteLeadAttachment(request.auth!.studioId!, id, attachmentId, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Timeline ─────────────────────────────────────────────────────────
  app.get("/leads/:id/timeline", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadTimeline.getLeadTimeline(request.auth!.studioId!, id) };
  });

  // ── AI insights ──────────────────────────────────────────────────────
  app.get("/leads/:id/ai/score", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadAi.getLeadScore(request.auth!.studioId!, id) };
  });

  app.get("/leads/:id/ai/budget-prediction", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadAi.getBudgetPrediction(request.auth!.studioId!, id) };
  });

  app.get("/leads/:id/ai/package-suggestion", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await leadAi.getPackageSuggestion(request.auth!.studioId!, id) };
  });
}
