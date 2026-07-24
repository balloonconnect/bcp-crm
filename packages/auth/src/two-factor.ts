import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 }; // allow ±1 step (±30s) of clock drift

export interface TwoFactorSetup {
  /** Store this encrypted (see docs/authentication.md § "Encrypting 2FA secrets at rest"). */
  secret: string;
  /** The otpauth:// URI an authenticator app scans. */
  otpauthUrl: string;
  /** A ready-to-render QR code as a data URL, for apps that want to display it directly. */
  qrCodeDataUrl: string;
}

/**
 * Generates a new TOTP secret for a user enabling 2FA. The secret must be
 * encrypted before persisting (it's a long-lived shared secret, unlike the
 * short-lived tokens elsewhere in this package) and only decrypted at
 * verification time.
 */
export async function generateTwoFactorSetup(accountLabel: string, issuer = "BCP Studio OS"): Promise<TwoFactorSetup> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(accountLabel, issuer, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrCodeDataUrl };
}

export function verifyTwoFactorCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}
