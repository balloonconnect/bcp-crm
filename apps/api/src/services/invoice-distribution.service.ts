import { prisma } from "@bcp/database";
import { sendAuthEmail } from "./notify";
import { getInvoice, getInvoiceOutstanding } from "./invoices.service";
import { sendWhatsAppMessage } from "./whatsapp-sender.service";
import { recordActivity } from "./activity-log.service";

export class RecipientNotFoundError extends Error {
  readonly code = "RECIPIENT_NOT_FOUND";
  constructor() {
    super("This invoice has no client with contact details to send to");
    this.name = "RecipientNotFoundError";
  }
}

async function resolveRecipient(studioId: string, invoiceId: string) {
  const invoice = await getInvoice(studioId, invoiceId);
  if (!invoice.clientId) throw new RecipientNotFoundError();
  const client = await prisma.client.findUnique({ where: { id: invoice.clientId }, select: { name: true, email: true, phone: true } });
  if (!client) throw new RecipientNotFoundError();
  return { invoice, client };
}

export async function sendInvoiceEmail(studioId: string, invoiceId: string, actorId: string) {
  const { invoice, client } = await resolveRecipient(studioId, invoiceId);
  if (!client.email) throw new RecipientNotFoundError();

  await sendAuthEmail({
    to: client.email,
    subject: `Your invoice ${invoice.invoiceNumber}`,
    html: `<p>Hi ${client.name},</p><p>Your invoice ${invoice.invoiceNumber} for ${(invoice.totalAmount / 100).toLocaleString("en-IN")} is attached/available on request.</p>`,
  });

  await recordActivity({ studioId, actorId, action: "invoice.emailed", resourceType: "Invoice", resourceId: invoiceId, metadata: { to: client.email } });
  return { sentTo: client.email };
}

export async function sendInvoiceWhatsApp(studioId: string, invoiceId: string, actorId: string) {
  const { invoice, client } = await resolveRecipient(studioId, invoiceId);
  if (!client.phone) throw new RecipientNotFoundError();

  let delivered = false;
  try {
    await sendWhatsAppMessage(
      studioId,
      { to: client.phone, messageType: "text", body: `Hi ${client.name}, your invoice ${invoice.invoiceNumber} total is Rs ${(invoice.totalAmount / 100).toLocaleString("en-IN")}.`, contextType: "Invoice", contextId: invoiceId },
      actorId,
    );
    delivered = true;
  } catch (error) {
    // Not configured is the expected local/dev state — degrade gracefully rather than failing the whole "send invoice" action over it. Any other error (opted out, plan limit) still surfaces to the caller.
    if (!(error instanceof Error) || error.name !== "WhatsAppNotConfiguredError") throw error;
  }

  await recordActivity({ studioId, actorId, action: "invoice.whatsapp_sent", resourceType: "Invoice", resourceId: invoiceId, metadata: { to: client.phone, delivered } });
  return { sentTo: client.phone, delivered };
}

/** A payment reminder for a specific outstanding invoice — templated around the actual outstanding amount, distinct from `reminders.service.ts`'s free-text manual reminder. */
export async function sendPaymentReminder(studioId: string, invoiceId: string, actorId: string) {
  const { invoice, client } = await resolveRecipient(studioId, invoiceId);
  const { outstanding } = await getInvoiceOutstanding(studioId, invoiceId);
  if (!client.email) throw new RecipientNotFoundError();

  await sendAuthEmail({
    to: client.email,
    subject: `Payment reminder: ${invoice.invoiceNumber}`,
    html: `<p>Hi ${client.name},</p><p>This is a reminder that ${(outstanding / 100).toLocaleString("en-IN")} is outstanding on invoice ${invoice.invoiceNumber}${invoice.dueDate ? ` (due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")})` : ""}.</p>`,
  });

  await recordActivity({ studioId, actorId, action: "invoice.payment_reminder_sent", resourceType: "Invoice", resourceId: invoiceId, metadata: { outstanding } });
  return { sentTo: client.email, outstanding };
}
