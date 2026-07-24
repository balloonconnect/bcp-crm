import { describe, expect, it } from "vitest";
import { renderContractVariables, extractContractVariables, renderContractSections, extractAllSectionVariables } from "../rendering";

describe("renderContractVariables", () => {
  it("substitutes named placeholders", () => {
    expect(renderContractVariables("This agreement is between {{studioName}} and {{clientName}}.", { studioName: "Balloon Connect", clientName: "Asha" })).toBe("This agreement is between Balloon Connect and Asha.");
  });

  it("leaves an unmatched variable as literal text", () => {
    expect(renderContractVariables("Event date: {{eventDate}}", {})).toBe("Event date: {{eventDate}}");
  });
});

describe("extractContractVariables", () => {
  it("extracts distinct variable names", () => {
    expect(extractContractVariables("{{clientName}} agrees to {{clientName}} terms on {{eventDate}}")).toEqual(["clientName", "eventDate"]);
  });
});

describe("renderContractSections", () => {
  it("joins sections with their headings, variables substituted", () => {
    const sections = [{ type: "payment_terms" as const, title: "Payment Terms", content: "Total due: {{amount}}" }];
    const result = renderContractSections(sections, { amount: "₹50,000" });
    expect(result).toContain("Payment Terms");
    expect(result).toContain("₹50,000");
  });
});

describe("extractAllSectionVariables", () => {
  it("collects variables across every section", () => {
    const sections = [
      { type: "event_details" as const, title: "Event", content: "{{eventDate}} at {{venue}}" },
      { type: "payment_terms" as const, title: "Payment", content: "{{amount}}" },
    ];
    expect(extractAllSectionVariables(sections)).toEqual(["eventDate", "venue", "amount"]);
  });
});
