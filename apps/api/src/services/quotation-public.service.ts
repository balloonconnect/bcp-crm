import { prisma } from "@bcp/database";
import { generateEmailOtp, verifyEmailOtp } from "@bcp/auth";
import { buildCustomerFacingQuotationView } from "@bcp/quotations";
import { sendAuthEmail } from "./notify";
import { recordActivity } from "./activity-log.service";
import { quotationToViewModel } from "./quotations.service";

export class QuotationPublicNotFoundError extends Error {
  readonly code = "QUOTATION_NOT_FOUND";
  constructor() {
    super("This quotation isn't available");
    this.name = "QuotationPublicNotFoundError";
  }
}

export class QuotationOtpInvalidError extends Error {
  readonly code = "QUOTATION_OTP_INVALID";
  constructor() {
    super("That code is incorrect or has expired");
    this.name = "QuotationOtpInvalidError";
  }
}

const quotationInclude = { lineItems: { orderBy: { order: "asc" as const } }, paymentSchedule: { orderBy: { order: "asc" as const } }, studio: { select: { name: true, slug: true } } };

async function findByToken(token: string) {
  const quotation = await prisma.quotation.findUnique({ where: { publicToken: token }, include: quotationInclude });
  if (!quotation) throw new QuotationPublicNotFoundError();
  return quotation;
}

/**
 * Records a public open of the quotation link — "View tracking" and "IP
 * and timestamp audit" in one row (see `QuotationView`'s schema doc) —
 * and auto-advances `sent → viewed` the first time it's opened. Called
 * on *every* successful resolution, OTP-gated or not, since the studio
 * cares about "did they open the link" independent of whether OTP
 * access is enabled for this quotation.
 */
export async function recordQuotationView(token: string, ipAddress: string | null, userAgent: string | null) {
  const quotation = await findByToken(token);

  await prisma.$transaction([
    prisma.quotationView.create({ data: { studioId: quotation.studioId, quotationId: quotation.id, ipAddress, userAgent } }),
    prisma.quotation.update({ where: { id: quotation.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date(), ...(quotation.status === "sent" ? { status: "viewed" } : {}) } }),
  ]);
}

export async function resolvePublicQuotation(token: string) {
  const quotation = await findByToken(token);
  return { studioName: quotation.studio.name, studioSlug: quotation.studio.slug, view: buildCustomerFacingQuotationView(quotationToViewModel(quotation as never)) };
}

// ── OTP access ───────────────────────────────────────────────────────

const OTP_TTL_MINUTES = 10;

export async function requestQuotationOtp(token: string, target: string, requestIp: string | null) {
  const quotation = await findByToken(token);
  const { code, codeHash } = generateEmailOtp();

  await prisma.quotationAccessCode.create({
    data: { quotationId: quotation.id, target, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000), requestIp },
  });

  await sendAuthEmail({ to: target, subject: "Your access code", html: `<p>Your code to view quotation ${quotation.quotationNumber} is <strong>${code}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>` });
}

export async function verifyQuotationOtp(token: string, target: string, code: string) {
  const quotation = await findByToken(token);

  const accessCode = await prisma.quotationAccessCode.findFirst({
    where: { quotationId: quotation.id, target, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!accessCode || !verifyEmailOtp(code, accessCode.codeHash)) {
    throw new QuotationOtpInvalidError();
  }

  await prisma.quotationAccessCode.update({ where: { id: accessCode.id }, data: { consumedAt: new Date() } });

  return { verified: true };
}

// ── Accept / reject (digital approval) ──────────────────────────────

export async function approveQuotation(input: {
  token: string;
  action: "accepted" | "rejected";
  signedByName?: string;
  rejectionReason?: string;
  otpVerified: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const quotation = await findByToken(input.token);

  await prisma.$transaction([
    prisma.quotationApproval.create({
      data: {
        studioId: quotation.studioId,
        quotationId: quotation.id,
        action: input.action,
        signedByName: input.signedByName,
        rejectionReason: input.rejectionReason,
        otpVerified: input.otpVerified,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    }),
    prisma.quotation.update({ where: { id: quotation.id }, data: { status: input.action, respondedAt: new Date() } }),
  ]);

  await recordActivity({
    studioId: quotation.studioId,
    actorId: "public", // the client, not a StudioUser — recordActivity's actorId column is plain text, not FK-constrained
    action: `quotation.${input.action}_by_client`,
    resourceType: "Quotation",
    resourceId: quotation.id,
    metadata: { signedByName: input.signedByName, otpVerified: input.otpVerified },
  });

  if (input.action === "accepted" && quotation.leadId) {
    await prisma.lead.updateMany({ where: { id: quotation.leadId, studioId: quotation.studioId }, data: { status: "negotiation" } });
  }

  return { status: input.action };
}
