import { describe, expect, it } from "vitest";
import { resolveCommissionPercent } from "../commission";
import { buildOrderNumber } from "../order-numbering";

describe("resolveCommissionPercent", () => {
  it("resolves to zero when disabled, regardless of the stored percent", () => {
    expect(resolveCommissionPercent({ commissionEnabled: false, commissionPercent: 15 })).toBe(0);
  });

  it("resolves to the configured percent once enabled", () => {
    expect(resolveCommissionPercent({ commissionEnabled: true, commissionPercent: 15 })).toBe(15);
  });
});

describe("buildOrderNumber", () => {
  it("formats a zero-padded order number", () => {
    expect(buildOrderNumber(1)).toBe("ORD-00001");
    expect(buildOrderNumber(42)).toBe("ORD-00042");
  });
});
