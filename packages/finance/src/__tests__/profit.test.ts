import { describe, expect, it } from "vitest";
import { computeEventGrossProfit, computeNetProfit, computeStudioProfitSummary } from "../profit";

describe("computeEventGrossProfit", () => {
  it("computes gross profit and margin", () => {
    const result = computeEventGrossProfit({ revenue: 1000000, directCost: 600000 });
    expect(result.grossProfit).toBe(400000);
    expect(result.grossMarginPercent).toBe(40);
  });

  it("returns 0% margin instead of dividing by zero", () => {
    expect(computeEventGrossProfit({ revenue: 0, directCost: 0 }).grossMarginPercent).toBe(0);
  });

  it("allows a negative gross profit when cost exceeds revenue", () => {
    const result = computeEventGrossProfit({ revenue: 500000, directCost: 700000 });
    expect(result.grossProfit).toBe(-200000);
  });
});

describe("computeNetProfit", () => {
  it("subtracts allocated overhead from gross profit", () => {
    const result = computeNetProfit({ grossProfit: 400000, allocatedOverhead: 100000 }, 1000000);
    expect(result.netProfit).toBe(300000);
    expect(result.netMarginPercent).toBe(30);
  });

  it("falls back to an implied base when no revenue is given", () => {
    const result = computeNetProfit({ grossProfit: 400000, allocatedOverhead: 100000 });
    expect(result.netProfit).toBe(300000);
  });
});

describe("computeStudioProfitSummary", () => {
  it("combines gross and net computation consistently", () => {
    const result = computeStudioProfitSummary(1000000, 600000, 100000);
    expect(result.grossProfit).toBe(400000);
    expect(result.netProfit).toBe(300000);
  });
});
