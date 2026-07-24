export interface PackageServiceCost {
  internalPriceSnapshot: number; // paise, per unit
  quantity: number;
}

/** Studio-facing only — sums what a package actually costs to deliver, for the studio's own margin visibility. Never part of `buildCustomerFacingPackageView`'s output. */
export function computeInternalPackageCost(services: PackageServiceCost[]): number {
  return services.reduce((sum, s) => sum + s.internalPriceSnapshot * s.quantity, 0);
}

export interface PackageMargin {
  internalCost: number;
  customerFacingTotal: number;
  margin: number; // paise
  marginPercent: number; // 0-100, relative to customerFacingTotal
}

/** Margin is relative to what the customer pays (not cost), the standard framing for "how much of what I'm charging is profit." Returns 0% margin (not NaN/Infinity) for a free/zero-priced package rather than dividing by zero. */
export function computePackageMargin(internalCost: number, customerFacingTotal: number): PackageMargin {
  const margin = customerFacingTotal - internalCost;
  const marginPercent = customerFacingTotal > 0 ? (margin / customerFacingTotal) * 100 : 0;
  return { internalCost, customerFacingTotal, margin, marginPercent };
}
