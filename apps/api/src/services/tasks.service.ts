import { prisma } from "@bcp/database";
import { isTaskUnblocked, shouldEscalate, computeNextOccurrence, resolveSlaDeadline } from "@bcp/workflow";
import { recordActivity } from "./activity-log.service";
import { sendAuthEmail } from "./notify";

export class TaskNotFoundError extends Error {
  readonly code = "TASK_NOT_FOUND";
  constructor() {
    super("Task not found");
    this.name = "TaskNotFoundError";
  }
}

export class TaskBlockedError extends Error {
  readonly code = "TASK_BLOCKED";
  constructor() {
    super("This task can't be started or completed until the tasks it depends on are completed.");
    this.name = "TaskBlockedError";
  }
}

const taskInclude = { checklistItems: { orderBy: { order: "asc" as const } }, comments: { orderBy: { createdAt: "desc" as const } }, attachments: true, assignee: { select: { id: true, name: true } } };

/** Escalation is resolved on every read rather than depending on a scheduled job — same pattern `bookings.service.ts` uses for payment-milestone overdue status. Any task past its SLA deadline and not yet escalated gets `escalatedAt` set (defaulting `escalatedToUserId` to the task's own assignee's reporting studio owner is out of scope for this phase — escalation currently just flags the task and notifies the assignee; routing to a specific escalation contact is a natural follow-up once studios have an org hierarchy to route through). */
async function resolveEscalations(studioId: string, tasks: { id: string; slaDeadline: Date | null; escalatedAt: Date | null; status: string; assigneeId: string | null; title: string }[]) {
  const now = new Date();
  const toEscalate = tasks.filter((t) => shouldEscalate({ slaDeadline: t.slaDeadline, escalatedAt: t.escalatedAt, status: t.status }, now));
  if (toEscalate.length === 0) return;

  await prisma.task.updateMany({ where: { id: { in: toEscalate.map((t) => t.id) } }, data: { escalatedAt: now } });

  for (const task of toEscalate) {
    if (!task.assigneeId) continue;
    const assignee = await prisma.studioUser.findUnique({ where: { id: task.assigneeId }, select: { email: true } });
    if (assignee) {
      await sendAuthEmail({ to: assignee.email, subject: `Overdue: ${task.title}`, html: `<p>The task "${task.title}" has passed its SLA deadline and needs attention.</p>` }).catch(() => undefined);
    }
  }

  await recordActivity({ studioId, actorId: "system", action: "task.escalated", resourceType: "Task", resourceId: toEscalate[0]!.id, metadata: { count: toEscalate.length } });
}

export async function listTasks(studioId: string, filter?: { status?: string; assigneeId?: string; bookingId?: string; eventId?: string; overdue?: boolean }) {
  const tasks = await prisma.task.findMany({
    where: {
      studioId,
      deletedAt: null,
      ...(filter?.status ? { status: filter.status as never } : {}),
      ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      ...(filter?.bookingId ? { bookingId: filter.bookingId } : {}),
      ...(filter?.eventId ? { eventId: filter.eventId } : {}),
      ...(filter?.overdue ? { dueDate: { lt: new Date() }, status: { notIn: ["completed", "cancelled"] } } : {}),
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { order: "asc" }],
  });

  await resolveEscalations(studioId, tasks);
  return tasks;
}

export async function getTask(studioId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId, deletedAt: null }, include: taskInclude });
  if (!task) throw new TaskNotFoundError();
  await resolveEscalations(studioId, [task]);
  return task;
}

export interface TaskInput {
  workflowInstanceId?: string;
  bookingId?: string;
  eventId?: string;
  stageKey?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: string;
  isApprovalStep?: boolean;
  slaHours?: number;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  dependsOnTaskIds?: string[];
  checklistItems?: string[];
}

export async function createTask(studioId: string, input: TaskInput, actorId: string) {
  const slaDeadline = input.slaHours ? resolveSlaDeadline(new Date(), input.slaHours) : undefined;

  const task = await prisma.task.create({
    data: {
      studioId,
      workflowInstanceId: input.workflowInstanceId,
      bookingId: input.bookingId,
      eventId: input.eventId,
      stageKey: input.stageKey,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      priority: (input.priority as never) ?? "medium",
      isApprovalStep: input.isApprovalStep ?? false,
      approvalStatus: input.isApprovalStep ? "pending" : "not_required",
      slaHours: input.slaHours,
      slaDeadline,
      isRecurring: input.isRecurring ?? false,
      recurrenceFrequency: input.recurrenceFrequency as never,
      recurrenceInterval: input.recurrenceInterval,
      dependsOnTaskIds: input.dependsOnTaskIds ?? [],
      createdBy: actorId,
      checklistItems: input.checklistItems?.length ? { create: input.checklistItems.map((description, order) => ({ description, order })) } : undefined,
    },
    include: taskInclude,
  });

  await recordActivity({ studioId, actorId, action: "task.created", resourceType: "Task", resourceId: task.id, metadata: { title: task.title } });
  return task;
}

export async function updateTask(studioId: string, taskId: string, input: Partial<TaskInput>, actorId: string) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, studioId, deletedAt: null } });
  if (!existing) throw new TaskNotFoundError();

  await prisma.task.updateMany({
    where: { id: taskId, studioId },
    data: {
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      priority: input.priority as never,
      slaHours: input.slaHours,
      dependsOnTaskIds: input.dependsOnTaskIds,
    },
  });

  await recordActivity({ studioId, actorId, action: "task.updated", resourceType: "Task", resourceId: taskId });
  return getTask(studioId, taskId);
}

/** Completing a recurring task creates its next occurrence immediately — a fresh Task with the same shape, a new due date computed from `computeNextOccurrence()`, and the completed task's own recurrence fields cleared so the history stays a clean one-task-per-occurrence record rather than an endlessly-rescheduling single row. */
async function spawnNextRecurrence(studioId: string, task: { id: string; title: string; description: string | null; stageKey: string | null; assigneeId: string | null; priority: string; recurrenceFrequency: string | null; recurrenceInterval: number | null; dueDate: Date | null; workflowInstanceId: string | null; bookingId: string | null; eventId: string | null }, actorId: string) {
  if (!task.recurrenceFrequency || !task.recurrenceInterval) return;
  const base = task.dueDate ?? new Date();
  const nextDue = computeNextOccurrence(base, task.recurrenceFrequency as never, task.recurrenceInterval);

  await prisma.task.create({
    data: {
      studioId,
      workflowInstanceId: task.workflowInstanceId,
      bookingId: task.bookingId,
      eventId: task.eventId,
      stageKey: task.stageKey,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      dueDate: nextDue,
      priority: task.priority as never,
      isRecurring: true,
      recurrenceFrequency: task.recurrenceFrequency as never,
      recurrenceInterval: task.recurrenceInterval,
      createdBy: actorId,
    },
  });
}

export async function changeTaskStatus(studioId: string, taskId: string, status: string, actorId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId, deletedAt: null } });
  if (!task) throw new TaskNotFoundError();

  if ((status === "in_progress" || status === "completed") && task.dependsOnTaskIds.length > 0) {
    const dependencies = await prisma.task.findMany({ where: { id: { in: task.dependsOnTaskIds } }, select: { id: true, status: true } });
    const depsById = new Map<string, { id: string; status: string; dependsOnTaskIds: string[] }>(dependencies.map((d: { id: string; status: string }) => [d.id, { id: d.id, status: d.status, dependsOnTaskIds: [] }]));
    if (!isTaskUnblocked({ id: task.id, status: task.status, dependsOnTaskIds: task.dependsOnTaskIds }, depsById)) {
      throw new TaskBlockedError();
    }
  }

  const data: Record<string, unknown> = { status };
  if (status === "completed") data.completedAt = new Date();

  await prisma.task.updateMany({ where: { id: taskId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "task.status_changed", resourceType: "Task", resourceId: taskId, metadata: { status } });

  if (status === "completed" && task.isRecurring) {
    await spawnNextRecurrence(studioId, task, actorId);
  }

  // If every task in this task's workflow instance is now completed/cancelled, close the instance out.
  if (status === "completed" && task.workflowInstanceId) {
    const siblings = await prisma.task.findMany({ where: { workflowInstanceId: task.workflowInstanceId }, select: { status: true } });
    const allDone = siblings.every((s: { status: string }) => s.status === "completed" || s.status === "cancelled");
    if (allDone) await prisma.workflowInstance.update({ where: { id: task.workflowInstanceId }, data: { status: "completed", completedAt: new Date() } });
  }

  return getTask(studioId, taskId);
}

export async function decideApproval(studioId: string, taskId: string, decision: "approved" | "rejected", actorId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId, deletedAt: null } });
  if (!task) throw new TaskNotFoundError();

  await prisma.task.updateMany({
    where: { id: taskId, studioId },
    data: { approvalStatus: decision, approvedByUserId: actorId, approvedAt: new Date(), status: decision === "approved" ? "completed" : task.status, completedAt: decision === "approved" ? new Date() : undefined },
  });
  await recordActivity({ studioId, actorId, action: `task.approval_${decision}`, resourceType: "Task", resourceId: taskId });

  return getTask(studioId, taskId);
}

// ── Checklist items ──────────────────────────────────────────────────

export async function addChecklistItem(studioId: string, taskId: string, description: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId } });
  if (!task) throw new TaskNotFoundError();
  const count = await prisma.taskChecklistItem.count({ where: { taskId } });
  return prisma.taskChecklistItem.create({ data: { taskId, description, order: count } });
}

export async function toggleChecklistItem(studioId: string, taskId: string, itemId: string, completed: boolean) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId } });
  if (!task) throw new TaskNotFoundError();
  return prisma.taskChecklistItem.update({ where: { id: itemId }, data: { completed } });
}

export async function removeChecklistItem(studioId: string, taskId: string, itemId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId } });
  if (!task) throw new TaskNotFoundError();
  await prisma.taskChecklistItem.delete({ where: { id: itemId } });
}

// ── Comments ─────────────────────────────────────────────────────────

export async function addComment(studioId: string, taskId: string, body: string, actorId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId } });
  if (!task) throw new TaskNotFoundError();
  const comment = await prisma.taskComment.create({ data: { studioId, taskId, body, authorId: actorId } });
  await recordActivity({ studioId, actorId, action: "task.commented", resourceType: "Task", resourceId: taskId });
  return comment;
}

// ── Attachments ──────────────────────────────────────────────────────

export async function addAttachment(studioId: string, taskId: string, input: { fileName: string; fileKey: string }, actorId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, studioId } });
  if (!task) throw new TaskNotFoundError();
  const attachment = await prisma.taskAttachment.create({ data: { studioId, taskId, fileName: input.fileName, fileKey: input.fileKey, uploadedBy: actorId } });
  await recordActivity({ studioId, actorId, action: "task.attachment_added", resourceType: "Task", resourceId: taskId, metadata: { fileName: input.fileName } });
  return attachment;
}
