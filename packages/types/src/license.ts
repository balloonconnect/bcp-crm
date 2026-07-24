export type LicenseTier = "starter" | "studio" | "agency" | "enterprise";

export interface LicenseKey {
  id: string;
  tenantId: string;
  tier: LicenseTier;
  key: string;
  issuedAt: string;
  expiresAt: string | null;
  seats: number;
  revoked: boolean;
}
