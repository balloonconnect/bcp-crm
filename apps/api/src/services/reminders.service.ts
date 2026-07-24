import { prisma } from "@bcp/database";
import { sendAuthEmail } from "./notify";
import { recordActivity } from "./activity-log.service";

export class ReminderTargetNotFoundError extends Error {
  readonly code = "REMINDER_TARGET_NOT_FOUND";
  constructor() {
    super("Could not find an email address to send this reminder to");
    this.name = "ReminderTargetNotFoundError";
  }
}

/**
 * Sends a one-off follow-up or payment reminder email to a lead or
 * client — the "Send reminder" quick action. Deliberately manual/
 * on-demand for now; automatic scheduled reminders (e.g. "3 days before
 * an unpaid invoice's due date") are the natural next step once a job
 * scheduler is wired up for studio-facing automation, not just platform
 * jobs.
 */
export async function sendReminder(input: {
  studioId: string;
  leadId?: string;
  clientId?: string;
  invoiceId?: string;
  message: string;
  actorId: string;
}) {
  let toEmail: string | null = null;
  let subject = "A reminder from your studio";

  if (input.leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: input.leadId, studioId: input.studioId } });
    toEmail = lead?.email ?? null;
    subject = "Following up on your enquiry";
  } else if (input.clientId) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, studioId: input.studioId } });
    toEmail = client?.email ?? null;
  }

  if (input.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: input.invoiceId, studioId: input.studioId }, include: { client: true } });
    if (invoice?.client?.email) toEmail = invoice.client.email;
    subject = "A reminder about your outstanding balance";
  }

  if (!toEmail) throw new ReminderTargetNotFoundError();

  await sendAuthEmail({ to: toEmail, subject, html: `<p>${input.message}</p>` });

  await recordActivity({
    studioId: input.studioId,
    actorId: input.actorId,
    action: "reminder.sent",
    resourceType: input.invoiceId ? "Invoice" : input.leadId ? "Lead" : "Client",
    resourceId: input.invoiceId ?? input.leadId ?? input.clientId ?? "unknown",
    metadata: { to: toEmail },
  });

  return { sentTo: toEmail };
}
