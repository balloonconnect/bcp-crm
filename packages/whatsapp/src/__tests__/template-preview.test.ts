import { describe, expect, it } from "vitest";
import { previewTemplate, countTemplateVariables } from "../template-preview";

describe("previewTemplate", () => {
  it("substitutes positional placeholders", () => {
    expect(previewTemplate("Hi {{1}}, your total is {{2}}.", ["Asha", "₹5,000"])).toBe("Hi Asha, your total is ₹5,000.");
  });

  it("leaves an unmatched placeholder untouched", () => {
    expect(previewTemplate("Hi {{1}}, code {{2}}.", ["Asha"])).toBe("Hi Asha, code {{2}}.");
  });

  it("handles a template with no placeholders", () => {
    expect(previewTemplate("Thanks for booking with us!", [])).toBe("Thanks for booking with us!");
  });
});

describe("countTemplateVariables", () => {
  it("counts distinct placeholders", () => {
    expect(countTemplateVariables("Hi {{1}}, order {{2}} total {{3}}")).toBe(3);
  });

  it("does not double-count a repeated placeholder", () => {
    expect(countTemplateVariables("{{1}} and {{1}} again")).toBe(1);
  });

  it("returns 0 for no placeholders", () => {
    expect(countTemplateVariables("Hello there")).toBe(0);
  });
});
