import { describe, expect, it } from "vitest";
import { buildCustomerFacingQuotationView, type QuotationForView } from "../customer-view";

function baseQuotation(overrides: Partial<QuotationForView> = {}): QuotationForView {
  return {
    quotationNumber: "Q-2026-0001",
    status: "sent",
    subtotal: 1000000,
    discountAmount: 0,
    gstRatePercent: 18,
    gstAmount: 180000,
    totalAmount: 1180000,
    itemLevelPricingEnabled: false,
    termsText: "50% advance required.",
    lineItems: [
      { kind: "service", name: "Traditional Photography", quantity: 1, unitPrice: 800000 },
      { kind: "add_on", name: "Extra album pages", quantity: 1, unitPrice: 50000 },
    ],
    paymentSchedule: [{ label: "Booking advance", percentage: 50, amount: 590000, trigger: "on_booking" }],
    ...overrides,
  };
}

describe("buildCustomerFacingQuotationView — the same rule extended to quotations", () => {
  it("never includes unitPrice or lineTotal when item-level pricing is disabled", () => {
    const view = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: false }));
    expect(view.itemLevelPricingShown).toBe(false);
    for (const item of view.lineItems) {
      expect(item.unitPrice).toBeUndefined();
      expect(item.lineTotal).toBeUndefined();
    }
  });

  it("still lists line item names and quantities with pricing hidden", () => {
    const view = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: false }));
    expect(view.lineItems.map((i) => i.name)).toEqual(["Traditional Photography", "Extra album pages"]);
  });

  it("includes unitPrice and lineTotal only when the studio explicitly enables item-level pricing", () => {
    const view = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: true }));
    expect(view.lineItems[0]!.unitPrice).toBe(800000);
    expect(view.lineItems[0]!.lineTotal).toBe(800000);
  });

  it("always shows subtotal, discount, GST, and total regardless of the flag — those are the customer's own figures, not internal costs", () => {
    const shown = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: true }));
    const hidden = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: false }));
    expect(shown.totalAmount).toBe(1180000);
    expect(hidden.totalAmount).toBe(1180000);
    expect(hidden.gstAmount).toBe(180000);
  });

  it("does not leak internal price figures under any field name when disabled", () => {
    const view = buildCustomerFacingQuotationView(baseQuotation({ itemLevelPricingEnabled: false }));
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("800000");
  });
});
