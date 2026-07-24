import { prisma } from "@bcp/database";
import { WhatsAppClient, previewTemplate, canSendTo, type OptInStatus } from "@bcp/whatsapp";
import { assertWithinPlanLimit, recordUsage } from "./plan-limit-enforcement";

export class WhatsAppNotConfiguredError extends Error {
  readonly code = "WHATSAPP_NOT_CONFIGURED";
  constructor() {
    super("WhatsApp isn't configured for this studio yet.");
    this.name = "WhatsAppNotConfiguredError";
  }
}

export class WhatsAppOptedOutError extends Error {
  readonly code = "WHATSAPP_OPTED_OUT";
  constructor() {
    super("This number has opted out of WhatsApp messages.");
    this.name = "WhatsAppOptedOutError";
  }
}

/**
 * Resolves the studio's own `WhatsAppConfig` first — the "Studio
 * configuration" the brief asks for, one set of Meta credentials per
 * studio, not a single platform-wide sender. Falls back to the
 * `WHATSAPP_*` environment variables only when a studio hasn't
 * configured its own yet, which keeps the degrade-gracefully behavior
 * quotation/invoice distribution already relied on before this phase
 * (a local/dev environment realistically has no real per-studio
 * credentials either way).
 */
async function resolveClient(studioId: string): Promise<{ client: WhatsAppClient; configId: string | null } | null> {
  const config = await prisma.whatsAppConfig.findFirst({ where: { studioId, isActive: true } });
  if (config?.accessToken && config.phoneNumberId) {
    return { client: new WhatsAppClient({ apiUrl: "https://graph.facebook.com/v20.0", accessToken: config.accessToken, phoneNumberId: config.phoneNumberId }), configId: config.id };
  }

  const apiUrl = process.env.WHATSAPP_API_URL;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (apiUrl && accessToken && phoneNumberId) return { client: new WhatsAppClient({ apiUrl, accessToken, phoneNumberId }), configId: null };

  return null;
}

async function resolveOptStatus(studioId: string, phone: string): Promise<OptInStatus> {
  const record = await prisma.whatsAppOptStatus.findUnique({ where: { studioId_phone: { studioId, phone } } });
  return (record?.status as OptInStatus) ?? "unknown";
}

export interface SendMessageInput {
  to: string;
  messageType: "text" | "template" | "image" | "document";
  body?: string;
  templateId?: string;
  variables?: string[];
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  contextType?: string;
  contextId?: string;
}

/**
 * The single send path everything else (quotations, invoices, receipts,
 * galleries, reminders, ...) should route through — resolves the
 * studio's config, checks opt-out and the plan's monthly message limit,
 * logs a `WhatsAppMessage` row before attempting the send (so a failed
 * send is still tracked, not silently lost), and records usage only on
 * genuine success. Delivery/read status updates come later, from the
 * webhook — this function only ever gets a message to `sent` or
 * `failed`, never further.
 */
export async function sendWhatsAppMessage(studioId: string, input: SendMessageInput, actorId: string) {
  const optStatus = await resolveOptStatus(studioId, input.to);
  if (!canSendTo(optStatus)) throw new WhatsAppOptedOutError();

  await assertWithinPlanLimit(studioId, "maxWhatsappMessagesPerMonth");

  const resolved = await resolveClient(studioId);

  let body = input.body ?? null;
  const variablesJson: string[] | undefined = input.variables;
  if (input.messageType === "template" && input.templateId) {
    const template = await prisma.whatsAppTemplate.findFirst({ where: { id: input.templateId, studioId } });
    if (template) body = previewTemplate(template.bodyText, input.variables ?? []);
  }

  const message = await prisma.whatsAppMessage.create({
    data: {
      studioId,
      templateId: input.templateId,
      toPhone: input.to,
      messageType: input.messageType,
      body,
      mediaUrl: input.mediaUrl,
      variables: variablesJson,
      contextType: input.contextType,
      contextId: input.contextId,
      sentBy: actorId,
      status: "queued",
    },
  });

  if (!resolved) {
    await prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: "failed", failureReason: "WhatsApp not configured for this studio", failedAt: new Date() } });
    throw new WhatsAppNotConfiguredError();
  }

  try {
    let result;
    if (input.messageType === "text") result = await resolved.client.sendText({ to: input.to, body: body ?? "" });
    else if (input.messageType === "template") {
      const template = await prisma.whatsAppTemplate.findFirst({ where: { id: input.templateId, studioId } });
      result = await resolved.client.sendTemplate({ to: input.to, templateName: template?.name ?? "", language: template?.language ?? "en", variables: input.variables });
    } else if (input.messageType === "image") result = await resolved.client.sendImage({ to: input.to, mediaUrl: input.mediaUrl ?? "", caption: input.caption });
    else result = await resolved.client.sendDocument({ to: input.to, mediaUrl: input.mediaUrl ?? "", caption: input.caption, filename: input.filename });

    await prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: "sent", sentAt: new Date(), providerMessageId: result.id } });
    await recordUsage(studioId, "maxWhatsappMessagesPerMonth");

    return { ...message, status: "sent" as const, providerMessageId: result.id };
  } catch (error) {
    await prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: "failed", failureReason: error instanceof Error ? error.message : "Unknown error", failedAt: new Date() } });
    throw error;
  }
}

export async function retryMessage(studioId: string, messageId: string, actorId: string) {
  const message = await prisma.whatsAppMessage.findFirst({ where: { id: messageId, studioId } });
  if (!message) throw new Error("Message not found");

  await prisma.whatsAppMessage.update({ where: { id: messageId }, data: { retryCount: { increment: 1 } } });

  return sendWhatsAppMessage(
    studioId,
    { to: message.toPhone, messageType: message.messageType as never, body: message.body ?? undefined, templateId: message.templateId ?? undefined, variables: (message.variables as string[] | null) ?? undefined, mediaUrl: message.mediaUrl ?? undefined, contextType: message.contextType ?? undefined, contextId: message.contextId ?? undefined },
    actorId,
  );
}
