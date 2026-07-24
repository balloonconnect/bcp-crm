import { z } from "zod";

export const galleryInputSchema = z.object({
  branchId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  layout: z.enum(["grid", "masonry", "story", "timeline", "highlights"]).optional(),
  password: z.string().min(4).max(100).optional(),
  otpRequired: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  guestAccessEnabled: z.boolean().optional(),
  allowOriginalDownload: z.boolean().optional(),
  allowCompressedDownload: z.boolean().optional(),
  downloadLimitPerGuest: z.number().int().positive().optional(),
  watermarkEnabled: z.boolean().optional(),
  watermarkText: z.string().max(100).optional(),
  coverPhotoId: z.string().uuid().optional(),
});
export const galleryUpdateSchema = galleryInputSchema.partial();

export const photoUploadInputSchema = z.object({
  fileKey: z.string().min(1),
  compressedKey: z.string().optional(),
  thumbnailKey: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  category: z.string().max(100).optional(),
});

export const photoUpdateInputSchema = z.object({ category: z.string().max(100).optional(), isHidden: z.boolean().optional(), order: z.number().int().optional() });

export const guestIdentifySchema = z.object({ guestName: z.string().max(160).optional(), guestPhone: z.string().max(20).optional(), guestEmail: z.string().email().optional() });
export const passwordVerifySchema = z.object({ password: z.string().min(1) });
export const otpVerifySchema = z.object({ code: z.string().length(6) });
export const commentInputSchema = z.object({ photoId: z.string().uuid().optional(), guestName: z.string().min(1).max(160), body: z.string().min(1).max(2000) });
export const downloadRequestSchema = z.object({ photoId: z.string().uuid().optional(), type: z.enum(["original", "compressed"]) });
