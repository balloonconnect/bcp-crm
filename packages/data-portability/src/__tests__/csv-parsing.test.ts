import { describe, expect, it } from "vitest";
import { parseCsv, rowsToRecords } from "../csv-parsing";

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    const { headers, rows } = parseCsv("name,phone\nAsha,+919876543210\nRavi,+919812345678");
    expect(headers).toEqual(["name", "phone"]);
    expect(rows).toEqual([["Asha", "+919876543210"], ["Ravi", "+919812345678"]]);
  });

  it("handles a quoted field containing a comma", () => {
    const { rows } = parseCsv('name,address\n"Sharma, Priya","123 Main St"');
    expect(rows[0]).toEqual(["Sharma, Priya", "123 Main St"]);
  });

  it("handles an escaped quote within a quoted field", () => {
    const { rows } = parseCsv('name,note\n"Ravi","He said ""hello"""');
    expect(rows[0]![1]).toBe('He said "hello"');
  });

  it("skips blank lines", () => {
    const { rows } = parseCsv("name\nAsha\n\nRavi");
    expect(rows).toHaveLength(2);
  });
});

describe("rowsToRecords", () => {
  it("zips headers with row values into records", () => {
    const records = rowsToRecords(["name", "phone"], [["Asha", "+91123"]]);
    expect(records).toEqual([{ name: "Asha", phone: "+91123" }]);
  });
});
