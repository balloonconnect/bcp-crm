import { prisma } from "@bcp/database";
import { sendAuthEmail } from "./notify";
import { getQuotation, changeQuotationStatus } from "./quotations.service";
import { sendWhatsAppMessage } from "./whatsapp-sender.service";
import { recordActivity } from "./activity-log.service";

function publicBaseUrl(): string {
  return process.env.PUBLIC_FORM_BASE_URL ?? "http://localhost:3003";
}

export function buildQuotationPublicUrl(publicToken: string): string {
  return `${publicBaseUrl().replace(/\/$/, "")}/quote/${publicToken}`;
}

export class RecipientNotFoundError extends Error {
  readonly code = "RECIPIENT_NOT_FOUND";
  constructor() {
    super("This quotation has no client or lead with contact details to send to");
    this.name = "RecipientNotFoundError";
  }
}

async function resolveRecipient(studioId: string, quotationId: string) {
  const quotation = await getQuotation(studioId, quotationId);
  if (quotation.clientId) {
    const client = await prisma.client.findUnique({ where: { id: quotation.clientId }, select: { name: true, email: true, phone: true } });
    if (client) return { quotation, name: client.name, email: client.email, phone: client.phone };
  }
  if (quotation.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: quotation.leadId }, select: { name: true, email: true, phone: true } });
    if (lead) return { quotation, name: lead.name, email: lead.email, phone: lead.phone };
  }
  throw new RecipientNotFoundError();
}

/**
 * Sends the public link, not a PDF attachment — `@bcp/email`'s client
 * doesn't support attachments, and a link the client can open (with the
 * PDF downloadable from that same page) is the more useful artifact
 * anyway: it's what gets viewed, tracked, and digitally approved.
 */
export async function sendQuotationEmail(studioId: string, quotationId: string, actorId: string) {
  const { quotation, name, email } = await resolveRecipient(studioId, quotationId);
  if (!email) throw new RecipientNotFoundError();

  const url = buildQuotationPublicUrl(quotation.publicToken);
  await sendAuthEmail({
    to: email,
    subject: `Your quotation ${quotation.quotationNumber}`,
    html: `<p>Hi ${name},</p><p>Here's your quotation: <a href="${url}">${url}</a></p>`,
  });

  if (quotation.status === "draft") await changeQuotationStatus(studioId, quotationId, "sent", actorId);
  await recordActivity({ studioId, actorId, action: "quotation.emailed", resourceType: "Quotation", resourceId: quotationId, metadata: { to: email } });

  return { sentTo: email };
}

export async function sendQuotationWhatsApp(studioId: string, quotationId: string, actorId: string) {
  const { quotation, name, phone } = await resolveRecipient(studioId, quotationId);
  if (!phone) throw new RecipientNotFoundError();

  const url = buildQuotationPublicUrl(quotation.publicToken);

  let delivered = false;
  try {
    await sendWhatsAppMessage(studioId, { to: phone, messageType: "text", body: `Hi ${name}, here's your quotation ${quotation.quotationNumber}: ${url}`, contextType: "Quotation", contextId: quotationId }, actorId);
    delivered = true;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "WhatsAppNotConfiguredError") throw error;
  }

  if (quotation.status === "draft") await changeQuotationStatus(studioId, quotationId, "sent", actorId);
  await recordActivity({ studioId, actorId, action: "quotation.whatsapp_sent", resourceType: "Quotation", resourceId: quotationId, metadata: { to: phone, delivered } });

  return { sentTo: phone, delivered };
}
