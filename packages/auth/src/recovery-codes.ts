import { randomBytes } from "node:crypto";
import { hashOpaqueToken, safeCompare } from "./opaque-tokens";

const RECOVERY_CODE_COUNT = 10;

/** Formats as e.g. "7K2P-9XQR" — easy to read aloud/type, still ~30 bits of entropy per code. */
function formatRecoveryCode(): string {
  const raw = randomBytes(6).toString("hex").toUpperCase().slice(0, 8);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export interface GeneratedRecoveryCode {
  /** Show this to the user exactly once. */
  code: string;
  /** Persist this instead. */
  codeHash: string;
}

/** Generates a fresh set of 10 recovery codes — call when 2FA is first enabled, and offer regeneration any time after. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): GeneratedRecoveryCode[] {
  return Array.from({ length: count }, () => {
    const code = formatRecoveryCode();
    return { code, codeHash: hashOpaqueToken(code) };
  });
}

export interface RecoveryCodeRecord {
  codeHash: string;
  usedAt: Date | null;
}

/**
 * Finds the first unused record whose hash matches the presented code.
 * The caller loads all of the actor's RecoveryCode rows (there are only
 * ever 10) and passes them in; this stays a pure function so it's
 * testable without a database.
 */
export function matchRecoveryCode(
  presentedCode: string,
  records: RecoveryCodeRecord[],
): RecoveryCodeRecord | null {
  const presentedHash = hashOpaqueToken(presentedCode.trim().toUpperCase());
  return (
    records.find((r) => r.usedAt === null && safeCompare(r.codeHash, presentedHash)) ?? null
  );
}
