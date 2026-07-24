import { z } from "zod";
import { LEAD_STATUS_KEYS } from "./pipeline";

const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const sourceEnum = z.enum(["website", "referral", "instagram", "whatsapp", "walk_in", "other"]);
const statusEnum = z.enum(LEAD_STATUS_KEYS as [string, ...string[]]);

/** Every field named in the brief — optional except `name`, matching how leads are actually captured (often just a name and a phone number from a DM or a walk-in, with the rest filled in over time). */
export const leadInputSchema = z.object({
  name: z.string().min(1).max(160),
  brideName: z.string().max(160).optional(),
  groomName: z.string().max(160).optional(),
  phone: z.string().max(20).optional(),
  alternateMobile: z.string().max(20).optional(),
  email: z.string().email().optional(),
  instagramProfile1: z.string().max(160).optional(),
  instagramProfile2: z.string().max(160).optional(),
  eventType: z.string().max(100).optional(),
  eventDate: z.string().datetime().optional(),
  venue: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  source: sourceEnum.optional(),
  budget: z.number().int().nonnegative().optional(),
  interestedPackage: z.string().max(160).optional(),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: priorityEnum.optional(),
  followUpAt: z.string().datetime().optional(),
  expectedValue: z.number().int().nonnegative().optional(),
  winProbability: z.number().int().min(0).max(100).optional(),
});

export const leadUpdateSchema = leadInputSchema.partial();

export const leadStatusChangeSchema = z.object({
  status: statusEnum,
  lostReason: z.string().max(500).optional(),
});

export const leadNoteSchema = z.object({ body: z.string().min(1).max(5000) });

export const leadCommunicationSchema = z.object({
  channel: z.enum(["call", "email", "whatsapp", "sms", "meeting", "other"]),
  direction: z.enum(["inbound", "outbound"]),
  summary: z.string().min(1).max(2000),
  occurredAt: z.string().datetime(),
});

export const bulkAssignSchema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(200), assignedTo: z.string().uuid() });
export const bulkStatusSchema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(200), status: statusEnum });
