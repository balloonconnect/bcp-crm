import { z } from "zod";

const triggerTypeEnum = z.enum(["lead_created", "lead_inactive", "follow_up_due", "quotation_sent", "quotation_viewed", "quotation_accepted", "booking_confirmed", "payment_due", "payment_overdue", "event_upcoming", "gallery_published", "selection_pending", "album_approved", "delivery_completed", "birthday", "anniversary"]);
const actionTypeEnum = z.enum(["send_whatsapp", "send_email", "create_task", "assign_user", "update_status", "add_tag", "generate_invoice", "send_notification", "call_webhook", "wait", "condition_branch"]);

export const createRuleSchema = z.object({ name: z.string().min(1).max(200), description: z.string().max(1000).optional(), triggerType: triggerTypeEnum, triggerConfig: z.record(z.unknown()).optional(), maxExecutionsPerHour: z.number().int().positive().optional() });
export const updateRuleSchema = createRuleSchema.partial();

export const createStepSchema = z.object({
  actionType: actionTypeEnum,
  actionConfig: z.record(z.unknown()).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  nextStepId: z.string().uuid().optional(),
  conditionTrueStepId: z.string().uuid().optional(),
  conditionFalseStepId: z.string().uuid().optional(),
  isEntryPoint: z.boolean().optional(),
});
export const updateStepSchema = createStepSchema.partial();

export const testRunSchema = z.object({ triggerContext: z.record(z.unknown()) });
