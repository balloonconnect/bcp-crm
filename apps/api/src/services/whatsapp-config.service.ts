import { prisma } from "@bcp/database";
import { countTemplateVariables, previewTemplate } from "@bcp/whatsapp";
import { recordActivity } from "./activity-log.service";

export async function getWhatsAppConfig(studioId: string) {
  return prisma.whatsAppConfig.findFirst({ where: { studioId } });
}

export interface WhatsAppConfigInput {
  metaBusinessId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  defaultSenderLabel?: string;
  isActive?: boolean;
}

export async function upsertWhatsAppConfig(studioId: string, input: WhatsAppConfigInput, actorId: string) {
  const existing = await prisma.whatsAppConfig.findFirst({ where: { studioId } });

  const config = existing
    ? await prisma.whatsAppConfig.update({ where: { id: existing.id }, data: input })
    : await prisma.whatsAppConfig.create({ data: { studioId, ...input } });

  await recordActivity({ studioId, actorId, action: "whatsapp_config.updated", resourceType: "WhatsAppConfig", resourceId: config.id });
  return config;
}

// ── Templates ────────────────────────────────────────────────────────

export async function listTemplates(studioId: string) {
  return prisma.whatsAppTemplate.findMany({ where: { studioId }, orderBy: { name: "asc" } });
}

export async function createTemplate(studioId: string, input: { name: string; category?: string; language?: string; bodyText: string; metaTemplateId?: string }, actorId: string) {
  const config = await prisma.whatsAppConfig.findFirst({ where: { studioId } });
  if (!config) throw new Error("Configure WhatsApp for this studio before adding templates.");

  const template = await prisma.whatsAppTemplate.create({
    data: { studioId, configId: config.id, name: input.name, category: (input.category as never) ?? "utility", language: input.language ?? "en", bodyText: input.bodyText, variableCount: countTemplateVariables(input.bodyText), metaTemplateId: input.metaTemplateId },
  });
  await recordActivity({ studioId, actorId, action: "whatsapp_template.created", resourceType: "WhatsAppTemplate", resourceId: template.id, metadata: { name: template.name } });
  return template;
}

export async function updateTemplateStatus(studioId: string, templateId: string, status: string, actorId: string) {
  await prisma.whatsAppTemplate.updateMany({ where: { id: templateId, studioId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "whatsapp_template.status_changed", resourceType: "WhatsAppTemplate", resourceId: templateId, metadata: { status } });
  return prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
}

/** "Template variable preview" — renders a template with sample values without sending anything, so a studio can check formatting before it goes to a real client. */
export async function previewTemplateById(studioId: string, templateId: string, variables: string[]) {
  const template = await prisma.whatsAppTemplate.findFirst({ where: { id: templateId, studioId } });
  if (!template) throw new Error("Template not found");
  return { preview: previewTemplate(template.bodyText, variables) };
}
