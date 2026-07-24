import { z } from "zod";

const priorityWeightsSchema = z.object({
  technicalQuality: z.number().min(0),
  emotionalMoments: z.number().min(0),
  peopleBalance: z.number().min(0),
  poseVariety: z.number().min(0),
});

export const startCullingSessionSchema = z.object({
  presetType: z.enum(["wedding", "engagement", "baby", "maternity", "birthday", "corporate", "school"]),
  priorityWeightOverrides: priorityWeightsSchema.partial().optional(),
  importantFaceIds: z.array(z.string()).max(20).optional(),
});

export const cullingReviewSchema = z.object({ status: z.enum(["approved", "rejected"]) });

export const startAlbumSuggestionSchema = z.object({
  presetType: z.enum(["wedding", "engagement", "baby", "maternity", "birthday", "corporate", "school"]),
  targetPhotoCount: z.number().int().positive().max(1000),
});

export const albumPhotoReviewSchema = z.object({ status: z.enum(["approved", "rejected"]) });

export const setAlbumCoverSchema = z.object({ galleryPhotoId: z.string().uuid() });
