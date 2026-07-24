import { z } from "zod";

export const eventInputSchema = z.object({
  branchId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  title: z.string().min(1).max(160),
  eventType: z.string().min(1).max(100),
  scheduledAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  venue: z.string().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  addressPostalCode: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contactPersonName: z.string().max(160).optional(),
  contactPersonPhone: z.string().max(20).optional(),
  dressNotes: z.string().max(2000).optional(),
  travelNotes: z.string().max(2000).optional(),
  accommodationNotes: z.string().max(2000).optional(),
  internalNotes: z.string().max(5000).optional(),
  deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
  assignedUserIds: z.array(z.string().uuid()).max(30).optional(),
  equipment: z.array(z.object({ equipmentId: z.string().uuid(), quantity: z.number().int().positive().default(1) })).max(50).optional(),
  serviceIds: z.array(z.string().uuid()).max(50).optional(),
});

export const eventUpdateSchema = eventInputSchema.partial();

export const shotListItemSchema = z.object({ description: z.string().min(1).max(500) });
export const scheduleItemSchema = z.object({ time: z.string().datetime(), label: z.string().min(1).max(200) });

export const equipmentInputSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(100).optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(1000).optional(),
});
export const equipmentUpdateSchema = equipmentInputSchema.partial();
