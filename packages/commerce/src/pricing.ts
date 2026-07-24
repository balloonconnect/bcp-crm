export interface PriceResolutionInput {
  basePriceInPaise: number;
  variantPriceInPaise: number | null; // the specific size/finish/quantity variant's own price, when one was selected
  eventOverridePriceInPaise: number | null; // "Event-specific pricing" — takes precedence over both when present
}

/**
 * The single price-resolution order every line item goes through:
 * an event-specific override (when a studio has bundled this exact
 * product/variant into this event's own pricing) wins outright over
 * everything else; otherwise a selected variant's own price wins over
 * the product's base price. Never averaged or combined — exactly one
 * of the three numbers is the actual price, chosen by specificity.
 */
export function resolveUnitPrice(input: PriceResolutionInput): number {
  if (input.eventOverridePriceInPaise !== null) return input.eventOverridePriceInPaise;
  if (input.variantPriceInPaise !== null) return input.variantPriceInPaise;
  return input.basePriceInPaise;
}
