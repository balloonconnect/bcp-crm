export type ExpiryUrgency = "none" | "expiring_soon" | "expired";

/** "Expiring soon" is within 30 days — long enough to actually act on a warranty/insurance renewal before it lapses, short enough not to flag everything a studio owns as urgent. */
const EXPIRING_SOON_WINDOW_DAYS = 30;

export function resolveExpiryUrgency(expiresAt: Date | null, now: Date = new Date()): ExpiryUrgency {
  if (!expiresAt) return "none";
  if (expiresAt.getTime() < now.getTime()) return "expired";
  const daysUntil = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= EXPIRING_SOON_WINDOW_DAYS ? "expiring_soon" : "none";
}

export interface EquipmentForExpiryCheck {
  id: string;
  name: string;
  warrantyExpiresAt: Date | null;
  insuranceExpiresAt: Date | null;
}

export interface ExpiryFlag {
  equipmentId: string;
  equipmentName: string;
  type: "warranty" | "insurance";
  urgency: ExpiryUrgency;
  expiresAt: Date;
}

/** Scans a studio's whole equipment list for anything with a warranty or insurance policy that's expired or expiring soon — the data behind an "equipment needing attention" list, computed on read rather than a scheduled job (same reasoning as SLA/escalation in `@bcp/workflow`). */
export function findExpiringEquipment(items: EquipmentForExpiryCheck[], now: Date = new Date()): ExpiryFlag[] {
  const flags: ExpiryFlag[] = [];
  for (const item of items) {
    const warrantyUrgency = resolveExpiryUrgency(item.warrantyExpiresAt, now);
    if (warrantyUrgency !== "none") flags.push({ equipmentId: item.id, equipmentName: item.name, type: "warranty", urgency: warrantyUrgency, expiresAt: item.warrantyExpiresAt! });

    const insuranceUrgency = resolveExpiryUrgency(item.insuranceExpiresAt, now);
    if (insuranceUrgency !== "none") flags.push({ equipmentId: item.id, equipmentName: item.name, type: "insurance", urgency: insuranceUrgency, expiresAt: item.insuranceExpiresAt! });
  }
  return flags;
}
