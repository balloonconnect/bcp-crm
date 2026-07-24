import { describe, expect, it } from "vitest";
import { contractTemplateInputSchema, createContractSchema, otpVerifySchema } from "../validation";

describe("contractTemplateInputSchema", () => {
  it("accepts a template with multiple sections", () => {
    const result = contractTemplateInputSchema.safeParse({
      name: "Wedding Contract",
      sections: [
        { type: "event_details", title: "Event Details", content: "Date: {{eventDate}}" },
        { type: "payment_terms", title: "Payment Terms", content: "Total: {{amount}}" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a template with no sections", () => {
    expect(contractTemplateInputSchema.safeParse({ name: "Empty", sections: [] }).success).toBe(false);
  });
});

describe("createContractSchema", () => {
  it("accepts a contract created from a template with witness required", () => {
    const result = createContractSchema.safeParse({ title: "Sharma Wedding Contract", templateId: "00000000-0000-0000-0000-000000000000", witnessRequired: true, witnessName: "Ravi Kumar" });
    expect(result.success).toBe(true);
  });
});

describe("otpVerifySchema", () => {
  it("requires exactly 6 digits", () => {
    expect(otpVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ code: "1234" }).success).toBe(false);
  });
});
