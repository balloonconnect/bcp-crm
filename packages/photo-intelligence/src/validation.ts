import { z } from "zod";

export const reviewActionSchema = z.object({ action: z.enum(["approve", "reject"]) });

export const bulkReviewSchema = z.object({
  photoAnalysisIds: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["approve", "reject"]),
});

export const duplicateGroupReviewSchema = z.object({ action: z.enum(["approve", "reject"]) });

export const setBestShotSchema = z.object({ galleryPhotoId: z.string().uuid() });

export const analysisFilterSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  isBlurry: z.coerce.boolean().optional(),
  closedEyeDetected: z.coerce.boolean().optional(),
  minQualityScore: z.coerce.number().min(0).max(100).optional(),
});
