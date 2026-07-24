import { describe, expect, it } from "vitest";
import { buildCustomerFacingPackageView, type PackageForView } from "../customer-view";

function basePackage(overrides: Partial<PackageForView> = {}): PackageForView {
  return {
    name: "Wedding Essentials",
    eventType: "wedding",
    description: "A full day of coverage",
    customerFacingTotal: 1500000,
    itemLevelPricingEnabled: false,
    durationLabel: "Full day",
    teamRequirement: "2 photographers",
    deliverables: ["500 edited photos", "1 highlight film"],
    taxRatePercent: 18,
    taxInclusive: false,
    discountAllowed: true,
    maxDiscountPercent: 10,
    termsText: "50% advance required.",
    services: [
      { name: "Traditional Photography", quantity: 1, internalPriceSnapshot: 800000 },
      { name: "Candid Photography", quantity: 1, internalPriceSnapshot: 600000 },
    ],
    addOns: [{ name: "Extra album pages", price: 50000 }],
    paymentSchedule: [{ label: "Booking advance", percentage: 50, trigger: "on_booking" }],
    ...overrides,
  };
}

describe("buildCustomerFacingPackageView — the core enforcement rule", () => {
  it("never includes unitPrice or lineTotal on included services when item-level pricing is disabled", () => {
    const view = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: false }));
    expect(view.itemLevelPricingShown).toBe(false);
    for (const service of view.includedServices) {
      expect(service.unitPrice).toBeUndefined();
      expect(service.lineTotal).toBeUndefined();
    }
  });

  it("still lists service names and quantities even with pricing hidden — customers see what's included, not what it costs", () => {
    const view = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: false }));
    expect(view.includedServices.map((s) => s.name)).toEqual(["Traditional Photography", "Candid Photography"]);
  });

  it("includes unitPrice and lineTotal only when the studio explicitly enables item-level pricing", () => {
    const view = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: true }));
    expect(view.itemLevelPricingShown).toBe(true);
    expect(view.includedServices[0]!.unitPrice).toBe(800000);
    expect(view.includedServices[0]!.lineTotal).toBe(800000);
  });

  it("computes lineTotal correctly for quantities greater than 1", () => {
    const view = buildCustomerFacingPackageView(
      basePackage({ itemLevelPricingEnabled: true, services: [{ name: "Album", quantity: 3, internalPriceSnapshot: 20000 }] }),
    );
    expect(view.includedServices[0]!.lineTotal).toBe(60000);
  });

  it("always shows the customer-facing total regardless of the item-level pricing flag", () => {
    const shown = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: true }));
    const hidden = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: false }));
    expect(shown.total).toBe(1500000);
    expect(hidden.total).toBe(1500000);
  });

  it("always shows add-on prices — add-ons aren't internal pricing, they're already customer-facing", () => {
    const view = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: false }));
    expect(view.addOns[0]!.price).toBe(50000);
  });

  it("does not leak internalPriceSnapshot under any other field name when disabled", () => {
    const view = buildCustomerFacingPackageView(basePackage({ itemLevelPricingEnabled: false }));
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("800000");
    expect(serialized).not.toContain("600000");
  });
});
