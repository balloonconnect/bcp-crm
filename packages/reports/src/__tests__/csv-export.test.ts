import { describe, expect, it } from "vitest";
import { buildReportCsv } from "../csv-export";

describe("buildReportCsv", () => {
  it("builds a header row and one row per record", () => {
    const csv = buildReportCsv([{ key: "name", header: "Name" }, { key: "amount", header: "Amount" }], [{ name: "Sharma Wedding", amount: 50000 }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Amount");
    expect(lines[1]).toBe("Sharma Wedding,50000");
  });

  it("quotes and escapes a value containing a comma", () => {
    const csv = buildReportCsv([{ key: "note", header: "Note" }], [{ note: "Includes, a comma" }]);
    expect(csv).toContain('"Includes, a comma"');
  });

  it("renders a missing value as empty", () => {
    const csv = buildReportCsv([{ key: "missing", header: "Missing" }], [{}]);
    expect(csv.split("\n")[1]).toBe("");
  });
});
