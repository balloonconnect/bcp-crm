import { describe, expect, it } from "vitest";
import { buildLabExportCsv } from "../lab-export";
import { createOrderSchema, couponInputSchema } from "../validation";

describe("buildLabExportCsv", () => {
  it("includes a header and one row per item, with the original file key", () => {
    const csv = buildLabExportCsv("ORD-00001", [{ orderItemId: "item-1", productName: "Canvas Print", size: "16x20", finish: "matte", quantity: 1, originalFileKey: "galleries/g1/originals/photo1.jpg" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Order,Item,Product,Size,Finish,Quantity,OriginalFile");
    expect(lines[1]).toContain("galleries/g1/originals/photo1.jpg");
  });

  it("flags a missing original file rather than leaving a blank a lab might miss", () => {
    const csv = buildLabExportCsv("ORD-00001", [{ orderItemId: "item-1", productName: "Print", size: null, finish: null, quantity: 1, originalFileKey: null }]);
    expect(csv).toContain("MISSING");
  });
});

describe("createOrderSchema", () => {
  it("accepts a valid order with shipping details", () => {
    const result = createOrderSchema.safeParse({ clientId: "00000000-0000-0000-0000-000000000000", items: [{ productId: "00000000-0000-0000-0000-000000000001", quantity: 2 }], shippingPaise: 5000 });
    expect(result.success).toBe(true);
  });

  it("rejects an order with no items", () => {
    expect(createOrderSchema.safeParse({ clientId: "00000000-0000-0000-0000-000000000000", items: [] }).success).toBe(false);
  });
});

describe("couponInputSchema", () => {
  it("accepts a category-restricted coupon", () => {
    expect(couponInputSchema.safeParse({ code: "CANVAS10", discountType: "percentage", discountValue: 10, appliesToCategory: "canvas" }).success).toBe(true);
  });
});
