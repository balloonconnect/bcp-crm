import { prisma } from "@bcp/database";
import QRCode from "qrcode";
import { buildPublicFormUrl, buildEmbedCode } from "@bcp/enquiry-form";
import { recordActivity } from "./activity-log.service";

export class EnquiryFormNotFoundError extends Error {
  readonly code = "ENQUIRY_FORM_NOT_FOUND";
  constructor() {
    super("Enquiry form not found");
    this.name = "EnquiryFormNotFoundError";
  }
}

export class EnquiryFormSlugTakenError extends Error {
  readonly code = "ENQUIRY_FORM_SLUG_TAKEN";
  constructor() {
    super("A form with this URL already exists for your studio");
    this.name = "EnquiryFormSlugTakenError";
  }
}

function publicBaseUrl(): string {
  return process.env.PUBLIC_FORM_BASE_URL ?? "http://localhost:3003";
}

export async function listEnquiryForms(studioId: string) {
  return prisma.enquiryForm.findMany({ where: { studioId }, orderBy: { createdAt: "desc" } });
}

export async function getEnquiryForm(studioId: string, formId: string) {
  const form = await prisma.enquiryForm.findFirst({ where: { id: formId, studioId } });
  if (!form) throw new EnquiryFormNotFoundError();
  return form;
}

export interface EnquiryFormInput {
  branchId?: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  formFieldsConfig?: Record<string, string>;
  eventTypes?: string[];
  contactMethods?: string[];
  consentRequired?: boolean;
  consentText?: string;
  termsUrl?: string;
  termsText?: string;
  successMessage?: string;
  autoResponseEnabled?: boolean;
  autoResponseMessage?: string;
  defaultAssignedTo?: string;
  isActive?: boolean;
}

export async function createEnquiryForm(studioId: string, input: EnquiryFormInput, actorId: string) {
  const existing = await prisma.enquiryForm.findUnique({ where: { studioId_slug: { studioId, slug: input.slug } } });
  if (existing) throw new EnquiryFormSlugTakenError();

  const form = await prisma.enquiryForm.create({
    data: {
      studioId,
      branchId: input.branchId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      formFieldsConfig: input.formFieldsConfig ?? {},
      eventTypes: input.eventTypes ?? [],
      contactMethods: (input.contactMethods as never) ?? ["phone", "email"],
      consentRequired: input.consentRequired ?? true,
      consentText: input.consentText,
      termsUrl: input.termsUrl,
      termsText: input.termsText,
      successMessage: input.successMessage,
      autoResponseEnabled: input.autoResponseEnabled ?? true,
      autoResponseMessage: input.autoResponseMessage,
      defaultAssignedTo: input.defaultAssignedTo,
      isActive: input.isActive ?? true,
      createdBy: actorId,
    },
  });

  await recordActivity({ studioId, actorId, action: "enquiry_form.created", resourceType: "EnquiryForm", resourceId: form.id, metadata: { title: form.title } });

  return form;
}

export async function updateEnquiryForm(studioId: string, formId: string, input: Partial<EnquiryFormInput>, actorId: string) {
  const existing = await prisma.enquiryForm.findFirst({ where: { id: formId, studioId } });
  if (!existing) throw new EnquiryFormNotFoundError();

  if (input.slug && input.slug !== existing.slug) {
    const clash = await prisma.enquiryForm.findUnique({ where: { studioId_slug: { studioId, slug: input.slug } } });
    if (clash) throw new EnquiryFormSlugTakenError();
  }

  await prisma.enquiryForm.updateMany({
    where: { id: formId, studioId },
    data: { ...input, contactMethods: input.contactMethods as never },
  });

  await recordActivity({ studioId, actorId, action: "enquiry_form.updated", resourceType: "EnquiryForm", resourceId: formId });

  return prisma.enquiryForm.findUnique({ where: { id: formId } });
}

/** The public link, embed snippet, and a QR code (as a data URI) for a form — everything a studio needs to actually distribute it. */
export async function getShareAssets(studioId: string, formId: string) {
  const form = await getEnquiryForm(studioId, formId);
  const studio = await prisma.studio.findUniqueOrThrow({ where: { id: studioId }, select: { slug: true } });

  const publicUrl = buildPublicFormUrl(publicBaseUrl(), studio.slug, form.slug);
  const embedCode = buildEmbedCode(publicUrl);
  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 400 });

  return { publicUrl, embedCode, qrCodeDataUrl };
}
