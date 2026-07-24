import { describe, expect, it } from "vitest";
import { resolveFinancialYear } from "../financial-year";

describe("resolveFinancialYear", () => {
  it("resolves an April date to that year's FY", () => {
    expect(resolveFinancialYear(new Date("2026-04-01"))).toBe("2026-27");
  });

  it("resolves a March date to the previous year's FY", () => {
    expect(resolveFinancialYear(new Date("2027-03-31"))).toBe("2026-27");
  });

  it("resolves a December date correctly", () => {
    expect(resolveFinancialYear(new Date("2026-12-25"))).toBe("2026-27");
  });

  it("resolves a January date to the previous year's FY", () => {
    expect(resolveFinancialYear(new Date("2027-01-15"))).toBe("2026-27");
  });
});
