import { prisma } from "@bcp/database";
import { extractTemplateVariables, renderEmailTemplate } from "@bcp/email";
import { recordActivity } from "./activity-log.service";

export async function getEmailConfig(studioId: string) {
  return prisma.emailConfig.findFirst({ where: { studioId } });
}

export interface EmailConfigInput {
  provider?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  sesAccessKeyId?: string;
  sesSecretAccessKey?: string;
  sesRegion?: string;
  resendApiKey?: string;
  fromAddress?: string;
  fromName?: string;
  isActive?: boolean;
}

export async function upsertEmailConfig(studioId: string, input: EmailConfigInput, actorId: string) {
  const existing = await prisma.emailConfig.findFirst({ where: { studioId } });
  const data = { ...input, provider: input.provider as never };

  const config = existing ? await prisma.emailConfig.update({ where: { id: existing.id }, data }) : await prisma.emailConfig.create({ data: { studioId, ...data } });

  await recordActivity({ studioId, actorId, action: "email_config.updated", resourceType: "EmailConfig", resourceId: config.id });
  return config;
}

// ── Templates ────────────────────────────────────────────────────────

export async function listEmailTemplates(studioId: string) {
  return prisma.emailTemplate.findMany({ where: { studioId }, orderBy: { name: "asc" } });
}

export async function createEmailTemplate(studioId: string, input: { name: string; subject: string; bodyHtml: string }, actorId: string) {
  const config = await prisma.emailConfig.findFirst({ where: { studioId } });
  const template = await prisma.emailTemplate.create({ data: { studioId, configId: config?.id, name: input.name, subject: input.subject, bodyHtml: input.bodyHtml, variables: extractTemplateVariables(input.bodyHtml) } });
  await recordActivity({ studioId, actorId, action: "email_template.created", resourceType: "EmailTemplate", resourceId: template.id, metadata: { name: template.name } });
  return template;
}

export async function previewEmailTemplateById(studioId: string, templateId: string, variables: Record<string, string>) {
  const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, studioId } });
  if (!template) throw new Error("Template not found");
  return { subject: renderEmailTemplate(template.subject, variables), bodyHtml: renderEmailTemplate(template.bodyHtml, variables) };
}
