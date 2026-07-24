import { prisma } from "@bcp/database";
import { validateSubmissionPayload, checkForSpam, type FormFieldsConfig } from "@bcp/enquiry-form";
import { findDuplicates, type ExistingLeadForMatching } from "@bcp/leads";
import { resolveStudioIdForAuth } from "./resolve-studio-for-auth";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { sendAuthEmail } from "./notify";
import { recordActivity } from "./activity-log.service";

export class EnquiryFormPublicNotFoundError extends Error {
  readonly code = "ENQUIRY_FORM_NOT_FOUND";
  constructor() {
    super("This form isn't available");
    this.name = "EnquiryFormPublicNotFoundError";
  }
}

export class EnquiryFormSubmissionInvalidError extends Error {
  readonly code = "ENQUIRY_FORM_SUBMISSION_INVALID";
  constructor(public readonly errors: string[]) {
    super(errors.join(" "));
    this.name = "EnquiryFormSubmissionInvalidError";
  }
}

const CONFIGURABLE_LEAD_FIELDS = [
  "brideName", "groomName", "phone", "alternateMobile", "email", "instagramProfile1", "instagramProfile2",
  "eventType", "eventDate", "venue", "city", "budget", "interestedPackage", "notes",
] as const;

/** Public, unauthenticated — resolved by `(studioSlug, formSlug)` or a verified custom-domain hostname, mirroring `/public/branding`. Only returns *active* forms; an inactive form 404s the same as a nonexistent one, so a studio can quietly retire a form without a dangling "form disabled" page indexed anywhere. */
export async function resolvePublicForm(input: { hostname: string | null; studioSlug?: string; formSlug: string }) {
  const studioId = await resolveStudioIdForAuth({ hostname: input.hostname, studioSlug: input.studioSlug });
  if (!studioId) throw new EnquiryFormPublicNotFoundError();

  const form = await prisma.enquiryForm.findFirst({ where: { studioId, slug: input.formSlug, isActive: true } });
  if (!form) throw new EnquiryFormPublicNotFoundError();

  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { name: true } });

  return { form, studioName: studio?.name ?? null };
}

export interface PublicSubmissionInput {
  formSlug: string;
  hostname: string | null;
  studioSlug?: string;
  payload: Record<string, unknown>;
  consentGiven: boolean;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  referrer?: string;
  honeypotValue?: string;
  msSinceRendered?: number;
  ipAddress: string | null;
  userAgent: string | null;
}

function toLeadFieldsFromPayload(payload: Record<string, unknown>) {
  const fields: Record<string, unknown> = { name: payload.name };
  for (const key of CONFIGURABLE_LEAD_FIELDS) {
    if (payload[key] !== undefined && payload[key] !== "") fields[key] = payload[key];
  }
  return fields;
}

/**
 * The full submission pipeline: resolve the form → validate against its
 * own field config → spam check → always record a submission row
 * (even a rejected one, for visibility into spam volume) → duplicate
 * check → create the Lead → notifications. Spam-flagged submissions
 * stop *before* lead creation (no lead, no notifications) but are still
 * recorded, so a studio can audit what got blocked.
 */
export async function submitPublicEnquiry(input: PublicSubmissionInput) {
  const studioId = await resolveStudioIdForAuth({ hostname: input.hostname, studioSlug: input.studioSlug });
  if (!studioId) throw new EnquiryFormPublicNotFoundError();

  const form = await prisma.enquiryForm.findFirst({ where: { studioId, slug: input.formSlug, isActive: true } });
  if (!form) throw new EnquiryFormPublicNotFoundError();

  const validation = validateSubmissionPayload(input.payload, form.formFieldsConfig as FormFieldsConfig, input.consentGiven, form.consentRequired);
  if (!validation.valid) throw new EnquiryFormSubmissionInvalidError(validation.errors);

  const recentCount = await prisma.enquiryFormSubmission.count({
    where: { studioId, ipAddress: input.ipAddress, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  const spamCheck = checkForSpam({ honeypotValue: input.honeypotValue, msSinceRendered: input.msSinceRendered, recentSubmissionsFromIp: recentCount });

  // Duplicate check runs regardless of spam status — worth knowing about even for a submission we don't convert to a lead.
  const duplicateCandidates = await prisma.lead.findMany({
    where: { studioId, deletedAt: null, OR: [{ phone: input.payload.phone as string }, { email: input.payload.email as string }].filter((c) => Object.values(c)[0]) },
    select: { id: true, name: true, phone: true, alternateMobile: true, email: true, instagramProfile1: true, instagramProfile2: true },
    take: 25,
  });
  const duplicates = findDuplicates(
    { phone: input.payload.phone as string, email: input.payload.email as string, instagramProfile1: input.payload.instagramProfile1 as string, instagramProfile2: input.payload.instagramProfile2 as string },
    duplicateCandidates as ExistingLeadForMatching[],
  );

  let leadId: string | null = null;

  if (!spamCheck.isSpam) {
    await assertWithinPlanLimit(studioId, "maxLeads");

    const lead = await prisma.lead.create({
      data: {
        studioId,
        branchId: form.branchId,
        ...toLeadFieldsFromPayload(input.payload),
        source: inferSource(input.utm),
        assignedTo: form.defaultAssignedTo,
      } as never,
    });
    leadId = lead.id;

    await recordActivity({ studioId, actorId: form.createdBy ?? "system", action: "lead.created_from_enquiry_form", resourceType: "Lead", resourceId: lead.id, metadata: { formId: form.id, formTitle: form.title } });
  }

  const submission = await prisma.enquiryFormSubmission.create({
    data: {
      studioId,
      formId: form.id,
      leadId,
      payload: input.payload as never,
      utmSource: input.utm?.source,
      utmMedium: input.utm?.medium,
      utmCampaign: input.utm?.campaign,
      utmTerm: input.utm?.term,
      utmContent: input.utm?.content,
      referrer: input.referrer,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      consentGiven: input.consentGiven,
      consentTextSnapshot: input.consentGiven ? form.consentText : null,
      isDuplicate: duplicates.length > 0,
      spamFlagged: spamCheck.isSpam,
      spamReason: spamCheck.reason,
    },
  });

  if (leadId) {
    await sendNotifications(studioId, form, input.payload, duplicates.length > 0);
  }

  return { submissionId: submission.id, leadId, isDuplicate: duplicates.length > 0, successMessage: form.successMessage };
}

function inferSource(utm?: { source?: string }): string {
  if (!utm?.source) return "website";
  const normalized = utm.source.toLowerCase();
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("referral")) return "referral";
  return "website";
}

async function sendNotifications(studioId: string, form: { id: string; title: string; defaultAssignedTo: string | null; autoResponseEnabled: boolean; autoResponseMessage: string | null }, payload: Record<string, unknown>, isDuplicate: boolean) {
  const leadName = String(payload.name ?? "A new enquiry");
  const leadEmail = typeof payload.email === "string" ? payload.email : null;

  // Notify the studio's owners/admins.
  const owners = await prisma.studioUser.findMany({
    where: { studioId, status: "active", deletedAt: null, roles: { some: { studioRole: { key: { in: ["owner", "admin"] } } } } },
    select: { email: true },
  });
  const notifyEmails = new Set<string>(owners.map((o: { email: string }) => o.email));

  // Notify the assigned salesperson too, if this form has a default assignment.
  if (form.defaultAssignedTo) {
    const assignee = await prisma.studioUser.findUnique({ where: { id: form.defaultAssignedTo }, select: { email: true } });
    if (assignee) notifyEmails.add((assignee as { email: string }).email);
  }

  await Promise.all(
    [...notifyEmails].map((to: string) =>
      sendAuthEmail({
        to,
        subject: `New enquiry: ${leadName}${isDuplicate ? " (possible duplicate)" : ""}`,
        html: `<p>A new enquiry came in via "${form.title}".</p><p>Name: ${leadName}${leadEmail ? `<br/>Email: ${leadEmail}` : ""}</p>`,
      }).catch(() => undefined), // one failed notification shouldn't fail the whole submission
    ),
  );

  // Customer confirmation / auto-response.
  if (form.autoResponseEnabled && leadEmail) {
    await sendAuthEmail({
      to: leadEmail,
      subject: "We've received your enquiry",
      html: `<p>${form.autoResponseMessage ?? "Thanks for reaching out — we'll be in touch shortly."}</p>`,
    }).catch(() => undefined);
  }
}
