import { prisma } from "@bcp/database";
import { EmailClient, renderEmailTemplate, applyStudioBranding, canSendTo } from "@bcp/email";
import { getEnv } from "@bcp/config";
import { assertWithinPlanLimit, recordUsage } from "./plan-limit-enforcement";

export class EmailUnsubscribedError extends Error {
  readonly code = "EMAIL_UNSUBSCRIBED";
  constructor() {
    super("This address has unsubscribed from emails.");
    this.name = "EmailUnsubscribedError";
  }
}

export class EmailProviderNotSupportedError extends Error {
  readonly code = "EMAIL_PROVIDER_NOT_SUPPORTED";
  constructor(provider: string) {
    super(`The ${provider} provider isn't wired up with live credentials in this environment yet — configure Resend or SMTP instead, or add the provider's SDK.`);
    this.name = "EmailProviderNotSupportedError";
  }
}

async function sendViaResend(apiKey: string, from: string, input: { to: string; subject: string; html: string }): Promise<{ id: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { id: string };
  return { id: json.id };
}

async function resolveAndSend(studioId: string, input: { to: string; subject: string; html: string }): Promise<{ providerMessageId: string }> {
  const config = await prisma.emailConfig.findFirst({ where: { studioId, isActive: true } });

  if (config?.provider === "resend" && config.resendApiKey) {
    const result = await sendViaResend(config.resendApiKey, config.fromAddress ?? "no-reply@example.com", input);
    return { providerMessageId: result.id };
  }

  if (config?.provider === "ses") throw new EmailProviderNotSupportedError("Amazon SES");

  if (config?.provider === "studio_smtp" && config.smtpHost && config.smtpPort) {
    const client = new EmailClient({ host: config.smtpHost, port: config.smtpPort, user: config.smtpUser ?? undefined, password: config.smtpPassword ?? undefined, from: config.fromAddress ?? "no-reply@example.com" });
    const result = await client.send(input);
    return { providerMessageId: result.messageId };
  }

  // platform_smtp, or no studio config at all yet — the platform's own shared sender (same Mailpit-in-dev / env-configured SMTP notify.ts already uses).
  const env = getEnv();
  const client = new EmailClient({ host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.EMAIL_FROM });
  const result = await client.send(input);
  return { providerMessageId: result.messageId };
}

export interface SendEmailInput {
  to: string;
  templateId?: string;
  subject?: string;
  bodyHtml?: string;
  variables?: Record<string, string>;
  attachmentKeys?: string[];
  contextType?: string;
  contextId?: string;
}

/**
 * The single send path everything else should route through — checks
 * unsubscribe status, checks the plan's email limit, applies studio
 * branding to the rendered body, logs an `EmailMessage` row before
 * attempting the send, then sends. Mirrors
 * `whatsapp-sender.service.ts`'s shape closely on purpose: the two
 * channels solve the same problem (config resolution, consent,
 * tracking, plan limits) and should look like siblings, not two
 * independently-invented patterns.
 */
export async function sendEmail(studioId: string, input: SendEmailInput, actorId: string) {
  const unsubscribed = await prisma.emailUnsubscribe.findUnique({ where: { studioId_email: { studioId, email: input.to } } });
  if (!canSendTo(Boolean(unsubscribed))) throw new EmailUnsubscribedError();

  await assertWithinPlanLimit(studioId, "maxEmailMessagesPerMonth");

  let subject = input.subject ?? "";
  let bodyHtml = input.bodyHtml ?? "";
  if (input.templateId) {
    const template = await prisma.emailTemplate.findFirst({ where: { id: input.templateId, studioId } });
    if (template) {
      subject = renderEmailTemplate(template.subject, input.variables ?? {});
      bodyHtml = renderEmailTemplate(template.bodyHtml, input.variables ?? {});
    }
  }

  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { name: true } });
  const branding = await prisma.studioBrand.findUnique({ where: { studioId }, select: { logoUrl: true, primaryColor: true } }).catch(() => null);
  const brandedHtml = applyStudioBranding(bodyHtml, { studioName: studio?.name ?? "", logoUrl: branding?.logoUrl ?? undefined, brandColor: branding?.primaryColor ?? undefined });

  const message = await prisma.emailMessage.create({
    data: { studioId, templateId: input.templateId, toAddress: input.to, subject, bodyHtml: brandedHtml, variables: input.variables, attachmentKeys: input.attachmentKeys ?? [], contextType: input.contextType, contextId: input.contextId, sentBy: actorId, status: "queued" },
  });

  try {
    const result = await resolveAndSend(studioId, { to: input.to, subject, html: brandedHtml });
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "sent", sentAt: new Date(), providerMessageId: result.providerMessageId } });
    await recordUsage(studioId, "maxEmailMessagesPerMonth");
    return { ...message, status: "sent" as const };
  } catch (error) {
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "failed", failureReason: error instanceof Error ? error.message : "Unknown error", failedAt: new Date() } });
    throw error;
  }
}

export async function retryEmail(studioId: string, messageId: string, actorId: string) {
  const message = await prisma.emailMessage.findFirst({ where: { id: messageId, studioId } });
  if (!message) throw new Error("Message not found");

  await prisma.emailMessage.update({ where: { id: messageId }, data: { retryCount: { increment: 1 } } });
  return sendEmail(studioId, { to: message.toAddress, subject: message.subject, bodyHtml: message.bodyHtml, attachmentKeys: message.attachmentKeys, contextType: message.contextType ?? undefined, contextId: message.contextId ?? undefined }, actorId);
}
