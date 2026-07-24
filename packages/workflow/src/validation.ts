import { z } from "zod";

export const workflowTemplateInputSchema = z.object({
  name: z.string().min(1).max(160),
  eventType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export const workflowTemplateUpdateSchema = workflowTemplateInputSchema.partial();

export const taskTemplateInputSchema = z.object({
  stageKey: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  order: z.number().int().optional(),
  defaultAssigneeRole: z.string().max(100).optional(),
  defaultDueOffsetDays: z.number().int().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  isApprovalStep: z.boolean().optional(),
  slaHours: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceInterval: z.number().int().positive().optional(),
  dependsOnTaskTemplateIds: z.array(z.string().uuid()).max(50).optional(),
  checklistItems: z.array(z.string().min(1).max(300)).max(50).optional(),
});
export const taskTemplateUpdateSchema = taskTemplateInputSchema.partial();

export const taskInputSchema = z.object({
  workflowInstanceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  stageKey: z.string().max(100).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  isApprovalStep: z.boolean().optional(),
  slaHours: z.number().int().positive().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceInterval: z.number().int().positive().optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).max(50).optional(),
  checklistItems: z.array(z.string().min(1).max(300)).max(50).optional(),
});
export const taskUpdateSchema = taskInputSchema.partial();

export const taskStatusChangeSchema = z.object({ status: z.enum(["pending", "in_progress", "blocked", "completed", "cancelled"]) });
export const taskApprovalSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

export const applyWorkflowSchema = z.object({
  workflowTemplateId: z.string().uuid().optional(), // omit to auto-resolve by event type / studio default
  bookingId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
});

export const taskCommentSchema = z.object({ body: z.string().min(1).max(5000) });
export const checklistItemSchema = z.object({ description: z.string().min(1).max(300) });
