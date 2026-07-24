import { z } from "zod";
import { BOOKING_STATUS_KEYS } from "./pipeline";

export const bookingUpdateSchema = z.object({
  branchId: z.string().uuid().optional(),
  deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
  notes: z.string().max(5000).optional(),
});

export const bookingStatusChangeSchema = z.object({ status: z.enum(BOOKING_STATUS_KEYS as [string, ...string[]]) });

export const teamAssignmentSchema = z.object({ studioUserId: z.string().uuid(), role: z.string().max(100).optional() });

export const paymentMilestoneUpdateSchema = z.object({ status: z.enum(["pending", "paid", "overdue"]) });
