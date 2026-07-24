import { z } from "zod";

export const assignDesignerSchema = z.object({ designerId: z.string().uuid() });
export const uploadSpreadSchema = z.object({ spreadNumber: z.number().int().nonnegative(), fileKey: z.string().min(1) });
export const spreadCommentSchema = z.object({ body: z.string().min(1).max(2000), positionX: z.number().min(0).max(1).optional(), positionY: z.number().min(0).max(1).optional() });
export const spreadApprovalSchema = z.object({ status: z.enum(["approved", "revision_requested"]), comment: z.string().max(2000).optional() });
export const revisionRequestSchema = z.object({ notes: z.string().min(1).max(2000) });
export const stageTransitionSchema = z.object({ stage: z.enum(["photos_selected", "designer_assigned", "design_started", "proof_uploaded", "client_review", "revision_requested", "approved", "sent_to_print", "printed", "dispatched", "delivered"]) });

export const printSpecificationSchema = z.object({ size: z.string().optional(), paperStock: z.string().optional(), binding: z.string().optional(), coverMaterial: z.string().optional() }).catchall(z.string());
export const printOrderInputSchema = z.object({
  copies: z.number().int().positive().optional(),
  printSpecification: printSpecificationSchema.optional(),
  labName: z.string().max(200).optional(),
  labContactName: z.string().max(160).optional(),
  labContactPhone: z.string().max(20).optional(),
  labContactEmail: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
});
export const courierInputSchema = z.object({ courierName: z.string().min(1).max(200), trackingNumber: z.string().min(1).max(200) });

export const eAlbumSettingsSchema = z.object({ password: z.string().min(4).max(100).optional(), otpRequired: z.boolean().optional(), downloadEnabled: z.boolean().optional() });
export const eAlbumOtpVerifySchema = z.object({ code: z.string().length(6) });
export const eAlbumPasswordVerifySchema = z.object({ password: z.string().min(1) });
