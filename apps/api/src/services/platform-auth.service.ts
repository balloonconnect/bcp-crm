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
  verifyTwoFactorCode,
  decryptSecret,
} from "@bcp/auth";
import { getEnv } from "@bcp/config";
import { issueSession, recordLoginHistory, type IssuedTokens } from "./session-issuer";
import { InvalidCredentialsError, TwoFactorRequiredError, type RequestMeta } from "./studio-auth.service";

export { InvalidCredentialsError, TwoFactorRequiredError, hashPassword };

export type PlatformLoginResult = IssuedTokens;

/**
 * Same shape as studio-auth.service's `login`, deliberately — lockout,
 * password verification, and the 2FA challenge pattern are identical
 * regardless of which table the actor lives in. Platform staff is a much
 * smaller, lower-volume user base, so this stays a separate (if
 * near-duplicate) function rather than a shared generic — see
 * docs/authentication.md § "Why studio and platform auth aren't merged
 * into one generic service" for the tradeoff.
 */
export async function platformLogin(input: {
  email: string;
  password: string;
  meta: RequestMeta;
}): Promise<PlatformLoginResult> {
  const user = await prisma.platformUser.findUnique({ where: { email: input.email } });

  if (!user || user.deletedAt || !user.passwordHash) {
    await recordLoginHistory({
      actorId: user?.id ?? "unknown",
      actorType: "platform_user",
      studioId: null,
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
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts, lockedUntil: lockout.lockedUntil },
    });
    await recordLoginHistory({
      actorId: user.id,
      actorType: "platform_user",
      studioId: null,
      success: false,
      failureReason: "bad_password",
      ...input.meta,
    });
    throw new InvalidCredentialsError();
  }

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  if (user.twoFactorEnabled) {
    const { token, tokenHash, expiresAt } = issueVerificationToken("login_otp");
    await prisma.verificationToken.create({
      data: {
        actorType: "platform_user",
        actorId: user.id,
        purpose: "login_otp",
        tokenHash,
        expiresAt,
        requestIp: input.meta.ipAddress,
      },
    });
    throw new TwoFactorRequiredError(token);
  }

  await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginHistory({
    actorId: user.id,
    actorType: "platform_user",
    studioId: null,
    success: true,
    ...input.meta,
  });

  return issueSession({ actorId: user.id, actorType: "platform_user", studioId: null, ...input.meta });
}

export async function completePlatformTwoFactorLogin(input: {
  challengeToken: string;
  code: string;
  meta: RequestMeta;
}): Promise<IssuedTokens> {
  const tokenHash = hashOpaqueToken(input.challengeToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  const validation = validateVerificationToken(record);
  if (!validation.ok || record?.purpose !== "login_otp" || record.actorType !== "platform_user") {
    throw new InvalidCredentialsError();
  }

  const user = await prisma.platformUser.findUnique({ where: { id: record.actorId } });
  if (!user || !user.twoFactorSecret) throw new InvalidCredentialsError();

  const env = getEnv();
  const secret = decryptSecret(user.twoFactorSecret, env.TWO_FACTOR_ENCRYPTION_KEY!);
  if (!verifyTwoFactorCode(input.code, secret)) throw new InvalidCredentialsError();

  await prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginHistory({
    actorId: user.id,
    actorType: "platform_user",
    studioId: null,
    success: true,
    ...input.meta,
  });

  return issueSession({ actorId: user.id, actorType: "platform_user", studioId: null, ...input.meta });
}
