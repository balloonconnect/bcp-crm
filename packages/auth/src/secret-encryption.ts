import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function deriveKey(secret: string): Buffer {
  // scrypt with a fixed, non-secret salt is acceptable here: the "secret"
  // being protected is TWO_FACTOR_ENCRYPTION_KEY itself (a high-entropy env
  // var, not a user password), so this is key derivation for a fixed-length
  // AES key, not password hashing — argon2 in password.ts is the right tool
  // for actual user passwords.
  return scryptSync(secret, "bcp-studio-os-2fa", 32);
}

/**
 * Encrypts a value (a TOTP secret) for storage in `two_factor_secret`.
 * Requires `TWO_FACTOR_ENCRYPTION_KEY` (see .env.example) — a 2FA secret
 * must never be stored in plaintext, unlike opaque tokens/recovery codes
 * which are stored as fast hashes since we never need the plaintext back.
 * A TOTP secret is different: verifying a 6-digit code requires the
 * original secret, not just a hash of it, so encryption (reversible) is
 * the correct primitive here, not hashing (one-way).
 */
export function encryptSecret(plaintext: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(ciphertext: string, encryptionKey: string): string {
  const [ivB64, authTagB64, dataB64] = ciphertext.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret");
  }
  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
