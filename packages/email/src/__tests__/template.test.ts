import { describe, expect, it } from "vitest";
import { renderEmailTemplate, extractTemplateVariables, applyStudioBranding } from "../template";

describe("renderEmailTemplate", () => {
  it("substitutes named placeholders", () => {
    expect(renderEmailTemplate("Hi {{clientName}}, total {{amount}}", { clientName: "Asha", amount: "₹5,000" })).toBe("Hi Asha, total ₹5,000");
  });

  it("leaves an unmatched variable as literal text", () => {
    expect(renderEmailTemplate("Hi {{clientName}}, code {{code}}", { clientName: "Asha" })).toBe("Hi Asha, code {{code}}");
  });
});

describe("extractTemplateVariables", () => {
  it("extracts distinct named variables", () => {
    expect(extractTemplateVariables("Hi {{clientName}}, {{clientName}} again, {{amount}}")).toEqual(["clientName", "amount"]);
  });

  it("returns an empty array with no variables", () => {
    expect(extractTemplateVariables("Hello there")).toEqual([]);
  });
});

describe("applyStudioBranding", () => {
  it("wraps the body with the studio name", () => {
    const result = applyStudioBranding("<p>Hi</p>", { studioName: "Balloon Connect" });
    expect(result).toContain("Balloon Connect");
    expect(result).toContain("<p>Hi</p>");
  });

  it("includes a logo image when provided", () => {
    const result = applyStudioBranding("<p>Hi</p>", { studioName: "Balloon Connect", logoUrl: "https://example.com/logo.png" });
    expect(result).toContain("https://example.com/logo.png");
  });
});
