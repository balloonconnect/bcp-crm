import { prisma } from "@bcp/database";
import { resolveSlaDeadline } from "@bcp/workflow";
import { recordActivity } from "./activity-log.service";
import { WorkflowTemplateNotFoundError } from "./workflow-templates.service";

export class NoWorkflowTemplateResolvedError extends Error {
  readonly code = "NO_WORKFLOW_TEMPLATE_RESOLVED";
  constructor() {
    super("No workflow template matches this event type, and the studio has no default workflow set up.");
    this.name = "NoWorkflowTemplateResolvedError";
  }
}

async function resolveTemplate(studioId: string, explicitTemplateId: string | undefined, eventType: string | null) {
  if (explicitTemplateId) {
    const template = await prisma.workflowTemplate.findFirst({ where: { id: explicitTemplateId, studioId, deletedAt: null } });
    if (!template) throw new WorkflowTemplateNotFoundError();
    return template;
  }

  if (eventType) {
    const byEventType = await prisma.workflowTemplate.findFirst({ where: { studioId, eventType, isActive: true, deletedAt: null } });
    if (byEventType) return byEventType;
  }

  const byDefault = await prisma.workflowTemplate.findFirst({ where: { studioId, isDefault: true, isActive: true, deletedAt: null } });
  if (byDefault) return byDefault;

  throw new NoWorkflowTemplateResolvedError();
}

async function resolveAssignee(studioId: string, role: string | null | undefined): Promise<string | undefined> {
  if (!role) return undefined;
  const assignment = await prisma.studioUserRole.findFirst({
    where: { studioUser: { studioId, status: "active", deletedAt: null }, studioRole: { key: { equals: role, mode: "insensitive" } } },
    select: { studioUserId: true },
  });
  return assignment?.studioUserId;
}

export interface ApplyWorkflowInput {
  workflowTemplateId?: string;
  bookingId?: string;
  eventId?: string;
}

/**
 * Instantiates a `WorkflowInstance` and one real `Task` per
 * `TaskTemplate` in the resolved workflow — the template chosen
 * explicitly, or by matching the target event's `eventType` against a
 * `WorkflowTemplate.eventType`, falling back to the studio's `isDefault`
 * template. This is the one function "workflow customization by event
 * type" actually resolves through. Task creation is two-pass: first
 * every task is created (so every template maps to a real task id),
 * then each task's `dependsOnTaskIds` is filled in from that mapping —
 * necessary because a template's dependencies can reference templates
 * later in `order`, not just earlier ones.
 */
export async function applyWorkflow(studioId: string, input: ApplyWorkflowInput, actorId: string) {
  let referenceDate: Date | null = null;
  let eventType: string | null = null;

  if (input.eventId) {
    const event = await prisma.event.findFirst({ where: { id: input.eventId, studioId }, select: { scheduledAt: true, eventType: true } });
    referenceDate = event?.scheduledAt ?? null;
    eventType = event?.eventType ?? null;
  } else if (input.bookingId) {
    const earliestEvent = await prisma.event.findFirst({ where: { studioId, bookingId: input.bookingId, deletedAt: null }, orderBy: { scheduledAt: "asc" }, select: { scheduledAt: true, eventType: true } });
    referenceDate = earliestEvent?.scheduledAt ?? null;
    eventType = earliestEvent?.eventType ?? null;
  }

  const template = await resolveTemplate(studioId, input.workflowTemplateId, eventType);
  const taskTemplates = await prisma.taskTemplate.findMany({ where: { workflowTemplateId: template.id }, orderBy: { order: "asc" } });

  const instance = await prisma.workflowInstance.create({
    data: { studioId, workflowTemplateId: template.id, bookingId: input.bookingId, eventId: input.eventId },
  });

  const now = new Date();
  const templateIdToTaskId = new Map<string, string>();

  for (const tt of taskTemplates as Array<{ id: string; stageKey: string; name: string; description: string | null; order: number; defaultAssigneeRole: string | null; defaultDueOffsetDays: number | null; priority: string; isApprovalStep: boolean; slaHours: number | null; isRecurring: boolean; recurrenceFrequency: string | null; recurrenceInterval: number | null; checklistItems: string[] }>) {
    const assigneeId = await resolveAssignee(studioId, tt.defaultAssigneeRole);
    const dueDate = referenceDate && tt.defaultDueOffsetDays !== null ? new Date(referenceDate.getTime() + tt.defaultDueOffsetDays * 24 * 60 * 60 * 1000) : undefined;
    const slaDeadline = tt.slaHours ? resolveSlaDeadline(now, tt.slaHours) : undefined;

    const task = await prisma.task.create({
      data: {
        studioId,
        workflowInstanceId: instance.id,
        taskTemplateId: tt.id,
        bookingId: input.bookingId,
        eventId: input.eventId,
        stageKey: tt.stageKey,
        title: tt.name,
        description: tt.description,
        order: tt.order,
        assigneeId,
        dueDate,
        priority: tt.priority as never,
        isApprovalStep: tt.isApprovalStep,
        approvalStatus: tt.isApprovalStep ? "pending" : "not_required",
        slaHours: tt.slaHours,
        slaDeadline,
        isRecurring: tt.isRecurring,
        recurrenceFrequency: tt.recurrenceFrequency as never,
        recurrenceInterval: tt.recurrenceInterval,
        createdBy: actorId,
        checklistItems: tt.checklistItems.length ? { create: tt.checklistItems.map((description, order) => ({ description, order })) } : undefined,
      },
    });

    templateIdToTaskId.set(tt.id, task.id);
  }

  // Second pass: translate each template's dependsOnTaskTemplateIds into real task ids now that all tasks exist.
  for (const tt of taskTemplates as Array<{ id: string; dependsOnTaskTemplateIds: string[] }>) {
    if (!tt.dependsOnTaskTemplateIds.length) continue;
    const taskId = templateIdToTaskId.get(tt.id);
    if (!taskId) continue;
    const dependsOnTaskIds = tt.dependsOnTaskTemplateIds.map((id) => templateIdToTaskId.get(id)).filter((id): id is string => Boolean(id));
    if (dependsOnTaskIds.length) await prisma.task.update({ where: { id: taskId }, data: { dependsOnTaskIds } });
  }

  await recordActivity({ studioId, actorId, action: "workflow.applied", resourceType: "WorkflowInstance", resourceId: instance.id, metadata: { workflowTemplateId: template.id, taskCount: taskTemplates.length } });

  return prisma.workflowInstance.findUnique({ where: { id: instance.id }, include: { tasks: { orderBy: { order: "asc" } } } });
}

export async function getWorkflowInstance(studioId: string, instanceId: string) {
  return prisma.workflowInstance.findFirst({ where: { id: instanceId, studioId }, include: { tasks: { orderBy: { order: "asc" } }, workflowTemplate: { select: { name: true } } } });
}

export async function listWorkflowInstances(studioId: string, filter?: { bookingId?: string; eventId?: string }) {
  return prisma.workflowInstance.findMany({
    where: { studioId, ...(filter?.bookingId ? { bookingId: filter.bookingId } : {}), ...(filter?.eventId ? { eventId: filter.eventId } : {}) },
    include: { tasks: { orderBy: { order: "asc" } }, workflowTemplate: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
  });
}
