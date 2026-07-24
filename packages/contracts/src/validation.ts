import { z } from "zod";

const contractSectionSchema = z.object({
  type: z.enum(["event_details", "payment_terms", "cancellation_terms", "delivery_terms", "copyright_terms", "model_release", "privacy_consent", "custom"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export const contractTemplateInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  sections: z.array(contractSectionSchema).min(1).max(30),
});
export const contractTemplateUpdateSchema = contractTemplateInputSchema.partial();

export const createContractSchema = z.object({
  title: z.string().min(1).max(200),
  templateId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  variableValues: z.record(z.string()).optional(),
  witnessRequired: z.boolean().optional(),
  witnessName: z.string().max(200).optional(),
  witnessEmail: z.string().email().optional(),
});

export const updateContractContentSchema = z.object({ bodyHtml: z.string().min(1), variableValues: z.record(z.string()).optional() });

export const otpVerifySchema = z.object({ code: z.string().length(6) });
export const witnessSignSchema = z.object({ witnessName: z.string().min(1).max(200) });
export const clientSignSchema = z.object({ signedByName: z.string().min(1).max(200) });
