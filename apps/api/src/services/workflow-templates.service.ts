import { prisma } from "@bcp/database";
import { DEFAULT_WORKFLOW_STAGES, detectDependencyCycle } from "@bcp/workflow";
import { recordActivity } from "./activity-log.service";

export class WorkflowTemplateNotFoundError extends Error {
  readonly code = "WORKFLOW_TEMPLATE_NOT_FOUND";
  constructor() {
    super("Workflow template not found");
    this.name = "WorkflowTemplateNotFoundError";
  }
}

export class TaskTemplateNotFoundError extends Error {
  readonly code = "TASK_TEMPLATE_NOT_FOUND";
  constructor() {
    super("Task template not found");
    this.name = "TaskTemplateNotFoundError";
  }
}

export class DependencyCycleError extends Error {
  readonly code = "DEPENDENCY_CYCLE";
  constructor() {
    super("These task templates depend on each other in a cycle, which would leave them permanently blocked.");
    this.name = "DependencyCycleError";
  }
}

const templateInclude = { tasks: { orderBy: { order: "asc" as const } } };

export async function listWorkflowTemplates(studioId: string, includeInactive = false) {
  return prisma.workflowTemplate.findMany({ where: { studioId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) }, include: templateInclude, orderBy: { createdAt: "desc" } });
}

export async function getWorkflowTemplate(studioId: string, templateId: string) {
  const template = await prisma.workflowTemplate.findFirst({ where: { id: templateId, studioId, deletedAt: null }, include: templateInclude });
  if (!template) throw new WorkflowTemplateNotFoundError();
  return template;
}

export interface WorkflowTemplateInput {
  name: string;
  eventType?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function createWorkflowTemplate(studioId: string, input: WorkflowTemplateInput, actorId: string) {
  // At most one default template per studio — the last one marked default wins, matching how a single "the fallback" concept should behave.
  if (input.isDefault) await prisma.workflowTemplate.updateMany({ where: { studioId, isDefault: true }, data: { isDefault: false } });

  const template = await prisma.workflowTemplate.create({ data: { studioId, ...input, createdBy: actorId }, include: templateInclude });
  await recordActivity({ studioId, actorId, action: "workflow_template.created", resourceType: "WorkflowTemplate", resourceId: template.id, metadata: { name: template.name } });
  return template;
}

export async function updateWorkflowTemplate(studioId: string, templateId: string, input: Partial<WorkflowTemplateInput>, actorId: string) {
  const existing = await prisma.workflowTemplate.findFirst({ where: { id: templateId, studioId, deletedAt: null } });
  if (!existing) throw new WorkflowTemplateNotFoundError();

  if (input.isDefault) await prisma.workflowTemplate.updateMany({ where: { studioId, isDefault: true, id: { not: templateId } }, data: { isDefault: false } });

  await prisma.workflowTemplate.updateMany({ where: { id: templateId, studioId }, data: input });
  await recordActivity({ studioId, actorId, action: "workflow_template.updated", resourceType: "WorkflowTemplate", resourceId: templateId });
  return getWorkflowTemplate(studioId, templateId);
}

export async function deleteWorkflowTemplate(studioId: string, templateId: string, actorId: string) {
  await prisma.workflowTemplate.updateMany({ where: { id: templateId, studioId }, data: { deletedAt: new Date(), isActive: false } });
  await recordActivity({ studioId, actorId, action: "workflow_template.deleted", resourceType: "WorkflowTemplate", resourceId: templateId });
}

/**
 * One-click seed of the studio's default workflow — the 17 stages
 * named in the brief, one `TaskTemplate` per stage, wired as a linear
 * dependency chain (each stage depends on the one before it) so the
 * seeded workflow is immediately usable, not just a flat task list.
 * Like `@bcp/catalog`'s service seeding, this creates one
 * `WorkflowTemplate` marked `isDefault` and every resulting row is a
 * completely normal, editable template afterward.
 */
export async function seedDefaultWorkflow(studioId: string, actorId: string) {
  const existingDefault = await prisma.workflowTemplate.findFirst({ where: { studioId, isDefault: true, deletedAt: null } });
  if (existingDefault) return existingDefault;

  await prisma.workflowTemplate.updateMany({ where: { studioId, isDefault: true }, data: { isDefault: false } });

  const template = await prisma.workflowTemplate.create({
    data: { studioId, name: "Default studio workflow", isDefault: true, createdBy: actorId },
  });

  const createdIds: string[] = [];
  for (const stage of DEFAULT_WORKFLOW_STAGES) {
    const task = await prisma.taskTemplate.create({
      data: {
        studioId,
        workflowTemplateId: template.id,
        stageKey: stage.key,
        name: stage.label,
        order: stage.order,
        dependsOnTaskTemplateIds: createdIds.length ? [createdIds[createdIds.length - 1]!] : [],
      },
    });
    createdIds.push(task.id);
  }

  await recordActivity({ studioId, actorId, action: "workflow_template.default_seeded", resourceType: "WorkflowTemplate", resourceId: template.id });

  return getWorkflowTemplate(studioId, template.id);
}

// ── Task templates within a workflow template ───────────────────────

export interface TaskTemplateInput {
  stageKey: string;
  name: string;
  description?: string;
  order?: number;
  defaultAssigneeRole?: string;
  defaultDueOffsetDays?: number;
  priority?: string;
  isApprovalStep?: boolean;
  slaHours?: number;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  dependsOnTaskTemplateIds?: string[];
  checklistItems?: string[];
}

async function assertNoDependencyCycle(workflowTemplateId: string, candidate?: { id?: string; dependsOnTaskTemplateIds: string[] }) {
  const existing = await prisma.taskTemplate.findMany({ where: { workflowTemplateId }, select: { id: true, dependsOnTaskTemplateIds: true } });
  const merged = candidate?.id ? existing.map((t: { id: string; dependsOnTaskTemplateIds: string[] }) => (t.id === candidate.id ? { id: t.id, dependsOnTaskTemplateIds: candidate.dependsOnTaskTemplateIds } : t)) : [...existing, { id: "candidate", dependsOnTaskTemplateIds: candidate?.dependsOnTaskTemplateIds ?? [] }];

  const result = detectDependencyCycle(merged);
  if (result.hasCycle) throw new DependencyCycleError();
}

export async function createTaskTemplate(studioId: string, workflowTemplateId: string, input: TaskTemplateInput, actorId: string) {
  const template = await prisma.workflowTemplate.findFirst({ where: { id: workflowTemplateId, studioId, deletedAt: null } });
  if (!template) throw new WorkflowTemplateNotFoundError();

  if (input.dependsOnTaskTemplateIds?.length) await assertNoDependencyCycle(workflowTemplateId, { dependsOnTaskTemplateIds: input.dependsOnTaskTemplateIds });

  const taskTemplate = await prisma.taskTemplate.create({ data: { studioId, workflowTemplateId, ...input, priority: (input.priority as never) ?? "medium", recurrenceFrequency: input.recurrenceFrequency as never } });
  await recordActivity({ studioId, actorId, action: "task_template.created", resourceType: "TaskTemplate", resourceId: taskTemplate.id, metadata: { name: taskTemplate.name } });
  return taskTemplate;
}

export async function updateTaskTemplate(studioId: string, taskTemplateId: string, input: Partial<TaskTemplateInput>, actorId: string) {
  const existing = await prisma.taskTemplate.findFirst({ where: { id: taskTemplateId, studioId } });
  if (!existing) throw new TaskTemplateNotFoundError();

  if (input.dependsOnTaskTemplateIds) await assertNoDependencyCycle(existing.workflowTemplateId, { id: taskTemplateId, dependsOnTaskTemplateIds: input.dependsOnTaskTemplateIds });

  await prisma.taskTemplate.updateMany({ where: { id: taskTemplateId, studioId }, data: { ...input, priority: input.priority as never, recurrenceFrequency: input.recurrenceFrequency as never } });
  await recordActivity({ studioId, actorId, action: "task_template.updated", resourceType: "TaskTemplate", resourceId: taskTemplateId });
  return prisma.taskTemplate.findUnique({ where: { id: taskTemplateId } });
}

export async function deleteTaskTemplate(studioId: string, taskTemplateId: string, actorId: string) {
  await prisma.taskTemplate.deleteMany({ where: { id: taskTemplateId, studioId } });
  await recordActivity({ studioId, actorId, action: "task_template.deleted", resourceType: "TaskTemplate", resourceId: taskTemplateId });
}
