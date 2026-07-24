import { describe, expect, it } from "vitest";
import { whatsappConfigInputSchema, templateInputSchema, sendTemplateInputSchema } from "../validation";

describe("whatsappConfigInputSchema", () => {
  it("accepts a partial config update", () => {
    expect(whatsappConfigInputSchema.safeParse({ phoneNumberId: "123456" }).success).toBe(true);
  });
});

describe("templateInputSchema", () => {
  it("accepts a minimal template", () => {
    expect(templateInputSchema.safeParse({ name: "booking_confirmation", bodyText: "Hi {{1}}, your booking is confirmed." }).success).toBe(true);
  });
});

describe("sendTemplateInputSchema", () => {
  it("accepts a template send with variables", () => {
    const result = sendTemplateInputSchema.safeParse({ to: "919876543210", templateId: "00000000-0000-0000-0000-000000000000", variables: ["Asha", "₹5,000"] });
    expect(result.success).toBe(true);
  });
});
