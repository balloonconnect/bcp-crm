import { describe, expect, it } from "vitest";
import { REPORT_TYPES, getReportTypeDefinition, groupReportsByCategory } from "../report-types";

describe("REPORT_TYPES", () => {
  it("has all 22 reports named in the brief", () => {
    expect(REPORT_TYPES).toHaveLength(22);
  });

  it("finds a report by key", () => {
    expect(getReportTypeDefinition("client_satisfaction")?.category).toBe("Clients");
  });
});

describe("groupReportsByCategory", () => {
  it("groups every report into a category", () => {
    const grouped = groupReportsByCategory();
    const totalGrouped = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(totalGrouped).toBe(22);
  });
});
