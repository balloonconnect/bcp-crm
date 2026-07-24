import { z } from "zod";

export const consentInputSchema = z.object({ consentText: z.string().min(1) });

export const startFaceSearchSchema = z.object({
  mode: z.enum(["live_scan", "selfie_upload"]),
  proceedDespiteWarning: z.boolean().optional(), // guest's explicit choice to continue after a multiple-face or low-light warning, rather than retaking
});

export const manualCorrectionSchema = z.object({ matchId: z.string().uuid(), isCorrect: z.boolean() });

export const gallerySettingsInputSchema = z.object({
  faceSearchEnabled: z.boolean().optional(),
  faceSearchConfidenceThreshold: z.number().int().min(0).max(100).optional(),
  faceSearchRetentionDays: z.number().int().positive().optional(),
});
