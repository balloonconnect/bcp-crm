import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  teamProfileInputSchema,
  teamDocumentInputSchema,
  teamEquipmentAssignmentSchema,
  attendanceInputSchema,
  leaveRequestInputSchema,
  leaveDecisionSchema,
  performanceNoteInputSchema,
  freelancerPaymentInputSchema,
  freelancerPaymentStatusSchema,
} from "@bcp/team";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as teamMembers from "../services/team-members.service";
import * as teamHr from "../services/team-hr.service";
import * as freelancerPayments from "../services/freelancer-payments.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function teamRoutes(app: FastifyInstance) {
  const viewTeam = [app.authenticate, requireStudioPermission("team:view")];
  const manageTeam = [app.authenticate, requireStudioPermission("team:manage")];
  const manageAttendance = [app.authenticate, requireStudioPermission("attendance:manage")];
  const manageFreelancerPayments = [app.authenticate, requireStudioPermission("freelancer_payment:manage")];

  // ── Team members ─────────────────────────────────────────────────────
  app.get("/team-members", { preHandler: viewTeam }, async (request) => ({ ok: true, data: await teamMembers.listTeamMembers(request.auth!.studioId!) }));

  app.get("/team-members/:id", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await teamMembers.getTeamMember(request.auth!.studioId!, id) };
  });

  app.patch("/team-members/:id/profile", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = teamProfileInputSchema.parse(request.body);
    return { ok: true, data: await teamMembers.updateTeamProfile(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/team-members/:id/workload", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await teamMembers.getTeamMemberWorkload(request.auth!.studioId!, id) };
  });

  app.get("/team-members/:id/conflicts", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await teamMembers.getTeamMemberConflicts(request.auth!.studioId!, id) };
  });

  // ── Documents ────────────────────────────────────────────────────────
  app.post("/team-members/:id/documents", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = teamDocumentInputSchema.parse(request.body);
    return { ok: true, data: await teamHr.addTeamDocument(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/team-documents/:id", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await teamHr.removeTeamDocument(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Equipment custody ────────────────────────────────────────────────
  app.post("/team-members/:id/equipment", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = teamEquipmentAssignmentSchema.parse(request.body);
    return { ok: true, data: await teamHr.assignEquipment(request.auth!.studioId!, id, body.equipmentId, body.notes, request.auth!.actorId) };
  });

  app.post("/team-equipment/:id/return", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await teamHr.returnEquipment(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Attendance ───────────────────────────────────────────────────────
  app.get("/team-members/:id/attendance", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const query = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() }).parse(request.query);
    return { ok: true, data: await teamHr.listAttendance(request.auth!.studioId!, id, query.from ? new Date(query.from) : undefined, query.to ? new Date(query.to) : undefined) };
  });

  app.post("/team-members/:id/attendance", { preHandler: manageAttendance }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = attendanceInputSchema.parse(request.body);
    return { ok: true, data: await teamHr.recordAttendance(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Leave ────────────────────────────────────────────────────────────
  app.get("/leave-requests", { preHandler: viewTeam }, async (request) => {
    const query = z.object({ studioUserId: z.string().uuid().optional(), status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await teamHr.listLeaveRequests(request.auth!.studioId!, query) };
  });

  app.post("/team-members/:id/leave-requests", { preHandler: manageAttendance }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = leaveRequestInputSchema.parse(request.body);
    try {
      return { ok: true, data: await teamHr.requestLeave(request.auth!.studioId!, id, body, request.auth!.actorId) };
    } catch (error) {
      if (error instanceof teamHr.OverlappingLeaveError) return reply.status(409).send({ ok: false, error: { code: error.code, message: error.message } });
      throw error;
    }
  });

  app.post("/leave-requests/:id/decision", { preHandler: manageAttendance }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { decision } = leaveDecisionSchema.parse(request.body);
    return { ok: true, data: await teamHr.decideLeave(request.auth!.studioId!, id, decision, request.auth!.actorId) };
  });

  // ── Performance ──────────────────────────────────────────────────────
  app.get("/team-members/:id/performance-notes", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await teamHr.listPerformanceNotes(request.auth!.studioId!, id) };
  });

  app.post("/team-members/:id/performance-notes", { preHandler: manageTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = performanceNoteInputSchema.parse(request.body);
    return { ok: true, data: await teamHr.addPerformanceNote(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Freelancer payments ──────────────────────────────────────────────
  app.get("/freelancer-payments", { preHandler: viewTeam }, async (request) => {
    const query = z.object({ studioUserId: z.string().uuid().optional(), status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await freelancerPayments.listFreelancerPayments(request.auth!.studioId!, query) };
  });

  app.get("/team-members/:id/freelancer-payments/summary", { preHandler: viewTeam }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await freelancerPayments.getFreelancerPaymentSummary(request.auth!.studioId!, id) };
  });

  app.post("/team-members/:id/freelancer-payments", { preHandler: manageFreelancerPayments }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = freelancerPaymentInputSchema.parse(request.body);
    return { ok: true, data: await freelancerPayments.createFreelancerPayment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/freelancer-payments/:id/status", { preHandler: manageFreelancerPayments }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = freelancerPaymentStatusSchema.parse(request.body);
    return { ok: true, data: await freelancerPayments.updateFreelancerPaymentStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });
}
