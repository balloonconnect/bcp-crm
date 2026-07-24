import { prisma } from "@bcp/database";
import {
  hashPassword,
  verifyPassword,
  evaluateLockout,
  isLocked,
  AccountLockedError,
  issueVerificationToken,
  validateVerificationToken,
  hashOpaqueToken,
  generateEmailOtp,
  verifyEmailOtp,
  verifyTwoFactorCode,
  decryptSecret,
} from "@bcp/auth";
import { getEnv } from "@bcp/config";
import { issueSession, recordLoginHistory, type IssuedTokens } from "./session-issuer";
import { sendAuthEmail } from "./notify";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { isSuspiciousLogin } from "@bcp/auth";

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export class InvalidCredentialsError extends Error {
  readonly code = "INVALID_CREDENTIALS";
  constructor() {
    super("Incorrect email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class TwoFactorRequiredError extends Error {
  readonly code = "TWO_FACTOR_REQUIRED";
  constructor(public readonly challengeToken: string) {
    super("Two-factor authentication code required");
    this.name = "TwoFactorRequiredError";
  }
}

export class InvitationInvalidError extends Error {
  readonly code = "INVITATION_INVALID";
  constructor(reason: string) {
    super(`Invitation is not valid: ${reason}`);
    this.name = "InvitationInvalidError";
  }
}

// ── Signup (via invitation) ─────────────────────────────────────────────

/**
 * Studio users are never created by open signup — they're created by
 * accepting an Invitation (see @bcp/database Invitation model). This
 * keeps every StudioUser traceable to who invited them and with what role.
 */
export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
  meta: RequestMeta;
}): Promise<IssuedTokens> {
  const invitation = await prisma.invitation.findUnique({ where: { token: input.token } });

  if (!invitation) throw new InvitationInvalidError("not_found");
  if (invitation.status !== "pending") throw new InvitationInvalidError(invitation.status);
  if (invitation.expiresAt.getTime() < Date.now()) throw new InvitationInvalidError("expired");

  // Enforce the plan's user-count limit before creating the account —
  // see apps/api/src/services/plan-limit-enforcement.ts. Throws
  // PlanLimitExceededError (mapped to HTTP 402) if the studio is already
  // at its plan's seat limit.
  await assertWithinPlanLimit(invitation.studioId, "maxUsers");

  const passwordHash = await hashPassword(input.password);

  const { studioUser } = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.studioUser.create({
      data: {
        studioId: invitation.studioId,
        branchId: invitation.branchId,
        email: invitation.email,
        name: input.name,
        passwordHash,
        status: "active",
        emailVerifiedAt: new Date(), // accepting an emailed invite proves mailbox ownership
        createdBy: invitation.invitedBy,
      },
    });

    await tx.studioUserRole.create({
      data: { studioUserId: created.id, studioRoleId: invitation.roleId, assignedBy: invitation.invitedBy },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    return { studioUser: created };
  });

  return issueSession({
    actorId: studioUser.id,
    actorType: "studio_user",
    studioId: studioUser.studioId,
    ...input.meta,
  });
}

// ── Login ────────────────────────────────────────────────────────────────

export type LoginResult = IssuedTokens;

export async function login(input: {
  email: string;
  password: string;
  studioId: string;
  meta: RequestMeta;
}): Promise<LoginResult> {
  const user = await prisma.studioUser.findUnique({
    where: { studioId_email: { studioId: input.studioId, email: input.email } },
  });

  if (!user || user.deletedAt || !user.passwordHash) {
    await recordLoginHistory({
      actorId: user?.id ?? "unknown",
      actorType: "studio_user",
      studioId: input.studioId,
      success: false,
      failureReason: "no_such_account",
      ...input.meta,
    });
    throw new InvalidCredentialsError();
  }

  if (isLocked(user.lockedUntil)) {
    throw new AccountLockedError(user.lockedUntil as Date);
  }

  const passwordOk = await verifyPassword(user.passwordHash, input.password);

  if (!passwordOk) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const lockout = evaluateLockout(failedAttempts);
    await prisma.studioUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts, lockedUntil: lockout.lockedUntil },
    });
    await recordLoginHistory({
      actorId: user.id,
      actorType: "studio_user",
      studioId: input.studioId,
      success: false,
      failureReason: "bad_password",
      ...input.meta,
    });
    throw new InvalidCredentialsError();
  }

  // Password correct — reset the failure counter regardless of what happens next.
  await prisma.studioUser.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  if (user.twoFactorEnabled) {
    const { token, tokenHash, expiresAt } = issueVerificationToken("login_otp");
    await prisma.verificationToken.create({
      data: {
        studioId: input.studioId,
        actorType: "studio_user",
        actorId: user.id,
        purpose: "login_otp",
        tokenHash,
        expiresAt,
        requestIp: input.meta.ipAddress,
      },
    });
    // Reused as a short-lived "2FA challenge" token, not emailed — the
    // client submits it back alongside the TOTP/recovery code.
    throw new TwoFactorRequiredError(token);
  }

  await prisma.studioUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginHistory({
    actorId: user.id,
    actorType: "studio_user",
    studioId: input.studioId,
    success: true,
    ...input.meta,
  });

  // "Suspicious-login alerts" — checked against this account's recent sessions *before* the new
  // one below is created, so the comparison is always against genuinely prior logins.
  const recentSessions = await prisma.session.findMany({
    where: { actorType: "studio_user", actorId: user.id, studioId: input.studioId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { ipAddress: true, userAgent: true },
  });
  if (isSuspiciousLogin(input.meta.ipAddress ?? null, input.meta.userAgent ?? null, recentSessions)) {
    await prisma.auditLog.create({
      data: { studioId: input.studioId, actorType: "studio_user", actorId: user.id, action: "auth.suspicious_login_detected", resourceType: "StudioUser", resourceId: user.id, ipAddress: input.meta.ipAddress, userAgent: input.meta.userAgent },
    });
    if (user.email) {
      await sendAuthEmail({
        to: user.email,
        subject: "New sign-in to your account",
        html: `<p>We noticed a sign-in to your account from a new device or location${input.meta.ipAddress ? ` (IP: ${input.meta.ipAddress})` : ""}. If this was you, no action is needed. If it wasn't, please reset your password immediately.</p>`,
      }).catch(() => undefined); // best-effort — a failed alert email never blocks the login itself
    }
  }

  return issueSession({
    actorId: user.id,
    actorType: "studio_user",
    studioId: input.studioId,
    ...input.meta,
  });
}

/** Completes a login that was interrupted by TwoFactorRequiredError. */
export async function completeTwoFactorLogin(input: {
  challengeToken: string;
  code: string;
  meta: RequestMeta;
}): Promise<IssuedTokens> {
  const tokenHash = hashOpaqueToken(input.challengeToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  const validation = validateVerificationToken(record);
  if (!validation.ok || record?.purpose !== "login_otp") {
    throw new InvalidCredentialsError();
  }

  const user = await prisma.studioUser.findUnique({ where: { id: record.actorId } });
  if (!user || !user.twoFactorSecret) throw new InvalidCredentialsError();

  const env = getEnv();
  const secret = decryptSecret(user.twoFactorSecret, env.TWO_FACTOR_ENCRYPTION_KEY!);
  const codeOk = verifyTwoFactorCode(input.code, secret);
  if (!codeOk) throw new InvalidCredentialsError();

  await prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  await prisma.studioUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginHistory({
    actorId: user.id,
    actorType: "studio_user",
    studioId: user.studioId,
    success: true,
    ...input.meta,
  });

  return issueSession({ actorId: user.id, actorType: "studio_user", studioId: user.studioId, ...input.meta });
}

// ── Email verification ──────────────────────────────────────────────────

export async function requestEmailVerification(studioUserId: string, studioId: string): Promise<void> {
  const user = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId } });
  if (!user || user.emailVerifiedAt) return;

  const { token, tokenHash, expiresAt } = issueVerificationToken("email_verification");
  await prisma.verificationToken.create({
    data: { studioId, actorType: "studio_user", actorId: user.id, purpose: "email_verification", tokenHash, expiresAt },
  });

  const appUrl = getEnv().APP_URL;
  await sendAuthEmail({
    to: user.email,
    subject: "Verify your email — BCP Studio OS",
    html: `<p>Confirm your email by visiting: <a href="${appUrl}/verify-email?token=${token}">${appUrl}/verify-email?token=${token}</a></p>`,
  });
}

export async function confirmEmailVerification(token: string): Promise<void> {
  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  const validation = validateVerificationToken(record);
  if (!validation.ok || record?.purpose !== "email_verification") {
    throw new InvitationInvalidError(validation.ok ? "wrong_purpose" : validation.reason);
  }

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.studioUser.update({ where: { id: record.actorId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

// ── Forgot / reset password ─────────────────────────────────────────────

export async function requestPasswordReset(email: string, studioId: string, meta: RequestMeta): Promise<void> {
  const user = await prisma.studioUser.findUnique({ where: { studioId_email: { studioId, email } } });
  if (!user) return; // never reveal whether an account exists

  const { token, tokenHash, expiresAt } = issueVerificationToken("password_reset");
  await prisma.verificationToken.create({
    data: {
      studioId,
      actorType: "studio_user",
      actorId: user.id,
      purpose: "password_reset",
      tokenHash,
      expiresAt,
      requestIp: meta.ipAddress,
    },
  });

  const appUrl = getEnv().APP_URL;
  await sendAuthEmail({
    to: user.email,
    subject: "Reset your password — BCP Studio OS",
    html: `<p>Reset your password: <a href="${appUrl}/reset-password?token=${token}">${appUrl}/reset-password?token=${token}</a></p><p>This link expires in 30 minutes.</p>`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  const validation = validateVerificationToken(record);
  if (!validation.ok || record?.purpose !== "password_reset") {
    throw new InvitationInvalidError(validation.ok ? "wrong_purpose" : validation.reason);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.studioUser.update({
      where: { id: record.actorId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    // A password reset is a strong signal of possible compromise recovery —
    // revoke every existing session so old, possibly-stolen sessions die immediately.
    prisma.session.updateMany({
      where: { actorId: record.actorId, actorType: "studio_user", revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// ── Email OTP (passwordless) login ──────────────────────────────────────

export async function requestOtpLogin(email: string, studioId: string, meta: RequestMeta): Promise<void> {
  const user = await prisma.studioUser.findUnique({ where: { studioId_email: { studioId, email } } });
  if (!user || user.deletedAt) return; // never reveal account existence

  const { code, codeHash } = generateEmailOtp();
  await prisma.verificationToken.create({
    data: {
      studioId,
      actorType: "studio_user",
      actorId: user.id,
      purpose: "login_otp",
      tokenHash: codeHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      requestIp: meta.ipAddress,
    },
  });

  await sendAuthEmail({
    to: user.email,
    subject: "Your sign-in code — BCP Studio OS",
    html: `<p>Your one-time sign-in code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}

export async function verifyOtpLogin(input: {
  email: string;
  studioId: string;
  code: string;
  meta: RequestMeta;
}): Promise<IssuedTokens> {
  const user = await prisma.studioUser.findUnique({
    where: { studioId_email: { studioId: input.studioId, email: input.email } },
  });
  if (!user) throw new InvalidCredentialsError();

  const record = await prisma.verificationToken.findFirst({
    where: { actorId: user.id, actorType: "studio_user", purpose: "login_otp", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const validation = validateVerificationToken(record);
  if (!validation.ok || !record || !verifyEmailOtp(input.code, record.tokenHash)) {
    throw new InvalidCredentialsError();
  }

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.studioUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    }),
  ]);

  await recordLoginHistory({
    actorId: user.id,
    actorType: "studio_user",
    studioId: input.studioId,
    success: true,
    ...input.meta,
  });

  return issueSession({ actorId: user.id, actorType: "studio_user", studioId: input.studioId, ...input.meta });
}
