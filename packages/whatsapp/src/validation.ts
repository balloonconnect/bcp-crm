import { z } from "zod";

export const whatsappConfigInputSchema = z.object({
  metaBusinessId: z.string().max(100).optional(),
  wabaId: z.string().max(100).optional(),
  phoneNumberId: z.string().max(100).optional(),
  accessToken: z.string().max(2000).optional(),
  webhookVerifyToken: z.string().max(200).optional(),
  defaultSenderLabel: z.string().max(160).optional(),
  isActive: z.boolean().optional(),
});

export const templateInputSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.enum(["marketing", "utility", "authentication"]).optional(),
  language: z.string().max(10).optional(),
  bodyText: z.string().min(1).max(2000),
  metaTemplateId: z.string().max(200).optional(),
});

export const sendTextInputSchema = z.object({ to: z.string().min(6).max(20), body: z.string().min(1).max(4096), contextType: z.string().optional(), contextId: z.string().uuid().optional() });
export const sendTemplateInputSchema = z.object({ to: z.string().min(6).max(20), templateId: z.string().uuid(), variables: z.array(z.string()).max(10).optional(), contextType: z.string().optional(), contextId: z.string().uuid().optional() });
export const sendMediaInputSchema = z.object({ to: z.string().min(6).max(20), mediaUrl: z.string().url(), caption: z.string().max(1024).optional(), filename: z.string().max(200).optional(), contextType: z.string().optional(), contextId: z.string().uuid().optional() });

export const previewTemplateInputSchema = z.object({ bodyText: z.string().min(1), variables: z.array(z.string()).max(10) });

export const optStatusInputSchema = z.object({ phone: z.string().min(6).max(20), status: z.enum(["opted_in", "opted_out", "unknown"]) });
