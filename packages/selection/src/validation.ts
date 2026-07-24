import { z } from "zod";

export const guestIdentifySchema = z.object({ guestName: z.string().max(160).optional(), guestPhone: z.string().max(20).optional(), guestEmail: z.string().email().optional() });
export const otpVerifySchema = z.object({ code: z.string().length(6) });

export const selectionActionSchema = z.object({ action: z.enum(["select", "deselect", "favorite", "unfavorite", "reject"]) });
export const commentInputSchema = z.object({ comment: z.string().max(1000) });

export const albumSettingsInputSchema = z.object({
  otpRequired: z.boolean().optional(),
  selectionLimit: z.number().int().positive().optional(),
  deadline: z.string().datetime().optional(),
  categoryLimits: z.array(z.object({ category: z.string().min(1).max(100), limitCount: z.number().int().positive() })).max(50).optional(),
});

export const reminderInputSchema = z.object({ message: z.string().max(2000).optional() });
