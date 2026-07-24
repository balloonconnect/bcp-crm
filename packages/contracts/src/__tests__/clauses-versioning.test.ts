import { describe, expect, it } from "vitest";
import { CONTRACT_CLAUSE_TYPES } from "../clauses";
import { resolveNextVersionNumber } from "../versioning";

describe("CONTRACT_CLAUSE_TYPES", () => {
  it("has the 6 named clause types plus event details and custom", () => {
    const keys = CONTRACT_CLAUSE_TYPES.map((c) => c.key);
    expect(keys).toContain("payment_terms");
    expect(keys).toContain("cancellation_terms");
    expect(keys).toContain("delivery_terms");
    expect(keys).toContain("copyright_terms");
    expect(keys).toContain("model_release");
    expect(keys).toContain("privacy_consent");
    expect(keys).toContain("event_details");
  });
});

describe("resolveNextVersionNumber", () => {
  it("increments by one", () => {
    expect(resolveNextVersionNumber(1)).toBe(2);
    expect(resolveNextVersionNumber(5)).toBe(6);
  });
});
