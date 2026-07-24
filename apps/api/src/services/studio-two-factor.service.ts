import { prisma } from "@bcp/database";
import {
  generateTwoFactorSetup,
  verifyTwoFactorCode,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  matchRecoveryCode,
  verifyPassword,
} from "@bcp/auth";
import { getEnv } from "@bcp/config";

export class TwoFactorError extends Error {
  readonly code = "TWO_FACTOR_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "TwoFactorError";
  }
}

/** Step 1: generate a pending secret + QR code. Not yet enabled — enabling happens in confirmTwoFactorSetup. */
export async function startTwoFactorSetup(studioUserId: string, studioId: string) {
  const user = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId } });
  if (!user) throw new TwoFactorError("User not found");
  if (user.twoFactorEnabled) throw new TwoFactorError("Two-factor authentication is already enabled");

  const setup = await generateTwoFactorSetup(user.email);
  const env = getEnv();
  const encrypted = encryptSecret(setup.secret, env.TWO_FACTOR_ENCRYPTION_KEY!);

  // Stored but not yet "enabled" — confirmTwoFactorSetup flips the flag
  // only after the user proves they can generate a valid code with it.
  await prisma.studioUser.update({ where: { id: user.id }, data: { twoFactorSecret: encrypted } });

  return { otpauthUrl: setup.otpauthUrl, qrCodeDataUrl: setup.qrCodeDataUrl };
}

/** Step 2: confirm the pending secret with a real code, enable 2FA, and issue recovery codes (shown once). */
export async function confirmTwoFactorSetup(
  studioUserId: string,
  studioId: string,
  code: string,
): Promise<{ recoveryCodes: string[] }> {
  const user = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId } });
  if (!user?.twoFactorSecret) throw new TwoFactorError("No pending two-factor setup for this account");

  const env = getEnv();
  const secret = decryptSecret(user.twoFactorSecret, env.TWO_FACTOR_ENCRYPTION_KEY!);
  if (!verifyTwoFactorCode(code, secret)) throw new TwoFactorError("Incorrect verification code");

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction([
    prisma.studioUser.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
    }),
    // Clear any pre-existing codes (e.g. a retry of setup) before inserting the fresh set.
    prisma.recoveryCode.deleteMany({ where: { actorId: user.id, actorType: "studio_user" } }),
    prisma.recoveryCode.createMany({
      data: recoveryCodes.map((c) => ({
        studioId,
        actorType: "studio_user" as const,
        actorId: user.id,
        codeHash: c.codeHash,
      })),
    }),
  ]);

  return { recoveryCodes: recoveryCodes.map((c) => c.code) };
}

export async function disableTwoFactor(studioUserId: string, studioId: string, password: string): Promise<void> {
  const user = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId } });
  if (!user?.passwordHash) throw new TwoFactorError("Account has no password set");

  const passwordOk = await verifyPassword(user.passwordHash, password);
  if (!passwordOk) throw new TwoFactorError("Incorrect password");

  await prisma.$transaction([
    prisma.studioUser.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { actorId: user.id, actorType: "studio_user" } }),
  ]);
}

export async function regenerateRecoveryCodes(studioUserId: string, studioId: string): Promise<string[]> {
  const user = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId } });
  if (!user?.twoFactorEnabled) throw new TwoFactorError("Two-factor authentication is not enabled");

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { actorId: user.id, actorType: "studio_user" } }),
    prisma.recoveryCode.createMany({
      data: recoveryCodes.map((c) => ({
        studioId,
        actorType: "studio_user" as const,
        actorId: user.id,
        codeHash: c.codeHash,
      })),
    }),
  ]);

  return recoveryCodes.map((c) => c.code);
}

/** Verifies a recovery code as a 2FA fallback and marks it used (single-use). */
export async function useRecoveryCode(studioUserId: string, presentedCode: string): Promise<boolean> {
  const records = await prisma.recoveryCode.findMany({
    where: { actorId: studioUserId, actorType: "studio_user", usedAt: null },
  });

  const match = matchRecoveryCode(presentedCode, records);
  if (!match) return false;

  const record = await prisma.recoveryCode.findFirst({ where: { codeHash: match.codeHash } });
  if (!record) return false;

  await prisma.recoveryCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return true;
}
