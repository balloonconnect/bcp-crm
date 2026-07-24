const MINOR_UNITS_PER_MAJOR = 100; // paise -> rupees

export function toMajorUnits(minorUnits: number): number {
  return Math.round((minorUnits / MINOR_UNITS_PER_MAJOR) * 100) / 100;
}

/** Converts a subscription's billing amount to a monthly-equivalent figure for MRR math. */
export function monthlyEquivalent(amountMinorUnits: number, billingCycle: "monthly" | "yearly"): number {
  return billingCycle === "yearly" ? amountMinorUnits / 12 : amountMinorUnits;
}
