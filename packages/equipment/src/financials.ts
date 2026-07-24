export interface EquipmentForValuation {
  quantity: number;
  replacementCost: number | null;
  purchasePrice: number | null;
}

export interface EquipmentValuationSummary {
  totalReplacementValue: number; // paise — falls back to purchase price per item when no replacement cost is set
  totalPurchaseValue: number; // paise
}

/** A studio's total equipment value, for insurance/planning purposes — replacement cost is preferred over purchase price per item (what it'd cost today, not what it cost then), falling back to purchase price only when no replacement cost was ever recorded. */
export function computeEquipmentValuation(items: EquipmentForValuation[]): EquipmentValuationSummary {
  let totalReplacementValue = 0;
  let totalPurchaseValue = 0;

  for (const item of items) {
    const unitReplacement = item.replacementCost ?? item.purchasePrice ?? 0;
    totalReplacementValue += unitReplacement * item.quantity;
    totalPurchaseValue += (item.purchasePrice ?? 0) * item.quantity;
  }

  return { totalReplacementValue, totalPurchaseValue };
}
