import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  workflowTemplateInputSchema,
  workflowTemplateUpdateSchema,
  taskTemplateInputSchema,
  taskTemplateUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
  taskStatusChangeSchema,
  taskApprovalSchema,
  applyWorkflowSchema,
  taskCommentSchema,
  checklistItemSchema,
} from "@bcp/workflow";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as workflowTemplates from "../services/workflow-templates.service";
import * as workflowInstances from "../services/workflow-instances.service";
import * as tasks from "../services/tasks.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const subIdParamsSchema = z.object({ id: z.string().uuid(), subId: z.string().uuid() });

export async function workflowRoutes(app: FastifyInstance) {
  const manageWorkflow = [app.authenticate, requireStudioPermission("workflow:manage")];
  const viewTask = [app.authenticate, requireStudioPermission("task:view")];
  const manageTask = [app.authenticate, requireStudioPermission("task:manage")];

  // ── Workflow templates ───────────────────────────────────────────────
  app.get("/workflow-templates", { preHandler: manageWorkflow }, async (request) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await workflowTemplates.listWorkflowTemplates(request.auth!.studioId!, includeInactive) };
  });

  app.get("/workflow-templates/:id", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await workflowTemplates.getWorkflowTemplate(request.auth!.studioId!, id) };
  });

  app.post("/workflow-templates", { preHandler: manageWorkflow }, async (request) => {
    const body = workflowTemplateInputSchema.parse(request.body);
    return { ok: true, data: await workflowTemplates.createWorkflowTemplate(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/workflow-templates/:id", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = workflowTemplateUpdateSchema.parse(request.body);
    return { ok: true, data: await workflowTemplates.updateWorkflowTemplate(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/workflow-templates/:id", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await workflowTemplates.deleteWorkflowTemplate(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  app.post("/workflow-templates/seed-default", { preHandler: manageWorkflow }, async (request) => ({
    ok: true,
    data: await workflowTemplates.seedDefaultWorkflow(request.auth!.studioId!, request.auth!.actorId),
  }));

  // ── Task templates ───────────────────────────────────────────────────
  app.post("/workflow-templates/:id/tasks", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = taskTemplateInputSchema.parse(request.body);
    return { ok: true, data: await workflowTemplates.createTaskTemplate(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/task-templates/:id", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = taskTemplateUpdateSchema.parse(request.body);
    return { ok: true, data: await workflowTemplates.updateTaskTemplate(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/task-templates/:id", { preHandler: manageWorkflow }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await workflowTemplates.deleteTaskTemplate(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Workflow instances ───────────────────────────────────────────────
  app.get("/workflow-instances", { preHandler: viewTask }, async (request) => {
    const query = z.object({ bookingId: z.string().uuid().optional(), eventId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await workflowInstances.listWorkflowInstances(request.auth!.studioId!, query) };
  });

  app.get("/workflow-instances/:id", { preHandler: viewTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await workflowInstances.getWorkflowInstance(request.auth!.studioId!, id) };
  });

  app.post("/workflow-instances/apply", { preHandler: manageTask }, async (request) => {
    const body = applyWorkflowSchema.parse(request.body);
    return { ok: true, data: await workflowInstances.applyWorkflow(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  // ── Tasks ────────────────────────────────────────────────────────────
  app.get("/tasks", { preHandler: viewTask }, async (request) => {
    const query = z
      .object({ status: z.string().optional(), assigneeId: z.string().uuid().optional(), bookingId: z.string().uuid().optional(), eventId: z.string().uuid().optional(), overdue: z.coerce.boolean().optional() })
      .parse(request.query);
    return { ok: true, data: await tasks.listTasks(request.auth!.studioId!, query) };
  });

  app.get("/tasks/:id", { preHandler: viewTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await tasks.getTask(request.auth!.studioId!, id) };
  });

  app.post("/tasks", { preHandler: manageTask }, async (request) => {
    const body = taskInputSchema.parse(request.body);
    return { ok: true, data: await tasks.createTask(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/tasks/:id", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = taskUpdateSchema.parse(request.body);
    return { ok: true, data: await tasks.updateTask(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/tasks/:id/status", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = taskStatusChangeSchema.parse(request.body);
    return { ok: true, data: await tasks.changeTaskStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.post("/tasks/:id/approval", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { decision } = taskApprovalSchema.parse(request.body);
    return { ok: true, data: await tasks.decideApproval(request.auth!.studioId!, id, decision, request.auth!.actorId) };
  });

  // ── Checklist items ──────────────────────────────────────────────────
  app.post("/tasks/:id/checklist", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { description } = checklistItemSchema.parse(request.body);
    return { ok: true, data: await tasks.addChecklistItem(request.auth!.studioId!, id, description) };
  });

  app.patch("/tasks/:id/checklist/:subId", { preHandler: manageTask }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    const { completed } = z.object({ completed: z.boolean() }).parse(request.body);
    return { ok: true, data: await tasks.toggleChecklistItem(request.auth!.studioId!, id, subId, completed) };
  });

  app.delete("/tasks/:id/checklist/:subId", { preHandler: manageTask }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    await tasks.removeChecklistItem(request.auth!.studioId!, id, subId);
    return { ok: true, data: null };
  });

  // ── Comments ─────────────────────────────────────────────────────────
  app.post("/tasks/:id/comments", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { body: commentBody } = taskCommentSchema.parse(request.body);
    return { ok: true, data: await tasks.addComment(request.auth!.studioId!, id, commentBody, request.auth!.actorId) };
  });

  // ── Attachments ──────────────────────────────────────────────────────
  app.post("/tasks/:id/attachments", { preHandler: manageTask }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = z.object({ fileName: z.string().min(1).max(255), fileKey: z.string().min(1) }).parse(request.body);
    return { ok: true, data: await tasks.addAttachment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });
}
