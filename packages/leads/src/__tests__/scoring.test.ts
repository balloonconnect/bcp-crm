import { describe, expect, it } from "vitest";
import { computeLeadScore, predictBudget, suggestPackage } from "../scoring";

describe("computeLeadScore", () => {
  it("scores a well-qualified, recently contacted lead highly", () => {
    const result = computeLeadScore({
      status: "qualified",
      priority: "high",
      source: "referral",
      hasPhone: true,
      hasEmail: true,
      hasBudget: true,
      hasEventDate: true,
      daysSinceLastContact: 1,
    });
    expect(result.score).toBeGreaterThan(70);
  });

  it("penalizes a lead that's never been contacted", () => {
    const contacted = computeLeadScore({ status: "new", priority: "medium", source: "website", hasPhone: true, hasEmail: false, hasBudget: false, hasEventDate: false, daysSinceLastContact: 0 });
    const neverContacted = computeLeadScore({ status: "new", priority: "medium", source: "website", hasPhone: true, hasEmail: false, hasBudget: false, hasEventDate: false, daysSinceLastContact: null });
    expect(neverContacted.score).toBeLessThan(contacted.score);
  });

  it("keeps the score within 0-100", () => {
    const result = computeLeadScore({ status: "lost", priority: "low", source: "other", hasPhone: false, hasEmail: false, hasBudget: false, hasEventDate: false, daysSinceLastContact: 30 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("predictBudget", () => {
  it("prefers a same-event-type average when there's enough history", () => {
    const wonLeads = [
      { eventType: "wedding", amount: 500000 },
      { eventType: "wedding", amount: 600000 },
      { eventType: "wedding", amount: 700000 },
      { eventType: "birthday", amount: 100000 },
    ];
    const prediction = predictBudget("wedding", wonLeads);
    expect(prediction.basis).toBe("event_type_average");
    expect(prediction.predictedAmount).toBe(600000);
  });

  it("falls back to the overall average with too little same-type history", () => {
    const wonLeads = [{ eventType: "wedding", amount: 500000 }, { eventType: "birthday", amount: 100000 }];
    const prediction = predictBudget("wedding", wonLeads);
    expect(prediction.basis).toBe("overall_average");
  });

  it("returns no prediction with no history at all", () => {
    expect(predictBudget("wedding", []).basis).toBe("insufficient_data");
  });
});

describe("suggestPackage", () => {
  const packages = [
    { name: "Essentials", price: 100000 },
    { name: "Premium", price: 300000 },
    { name: "Luxury", price: 800000 },
  ];

  it("suggests the closest package at or under budget", () => {
    const suggestion = suggestPackage(350000, packages);
    expect(suggestion.suggestedPackage?.name).toBe("Premium");
  });

  it("suggests the cheapest package when everything is over budget", () => {
    const suggestion = suggestPackage(50000, packages);
    expect(suggestion.suggestedPackage?.name).toBe("Essentials");
  });

  it("returns null with no stated budget", () => {
    expect(suggestPackage(null, packages).suggestedPackage).toBeNull();
  });

  it("returns null with no packages configured", () => {
    expect(suggestPackage(500000, []).suggestedPackage).toBeNull();
  });
});
