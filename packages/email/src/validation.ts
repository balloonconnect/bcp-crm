import { z } from "zod";

export const emailConfigInputSchema = z.object({
  provider: z.enum(["platform_smtp", "studio_smtp", "ses", "resend"]).optional(),
  smtpHost: z.string().max(200).optional(),
  smtpPort: z.number().int().positive().optional(),
  smtpUser: z.string().max(200).optional(),
  smtpPassword: z.string().max(500).optional(),
  sesAccessKeyId: z.string().max(200).optional(),
  sesSecretAccessKey: z.string().max(500).optional(),
  sesRegion: z.string().max(50).optional(),
  resendApiKey: z.string().max(500).optional(),
  fromAddress: z.string().email().optional(),
  fromName: z.string().max(160).optional(),
  isActive: z.boolean().optional(),
});

export const emailTemplateInputSchema = z.object({
  name: z.string().min(1).max(160),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
});

export const sendEmailInputSchema = z.object({
  to: z.string().email(),
  templateId: z.string().uuid().optional(),
  subject: z.string().max(300).optional(),
  bodyHtml: z.string().optional(),
  variables: z.record(z.string()).optional(),
  attachmentKeys: z.array(z.string()).max(10).optional(),
  contextType: z.string().optional(),
  contextId: z.string().uuid().optional(),
});

export const previewTemplateInputSchema = z.object({ bodyHtml: z.string().min(1), variables: z.record(z.string()) });
