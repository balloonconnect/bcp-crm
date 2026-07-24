import { describe, expect, it } from "vitest";
import { buildDocumentNumber } from "../numbering";

describe("buildDocumentNumber", () => {
  it("builds a number without a branch code", () => {
    expect(buildDocumentNumber({ prefix: "INV", financialYear: "2026-27", sequence: 1 })).toBe("INV/2026-27/0001");
  });

  it("builds a number with a branch code", () => {
    expect(buildDocumentNumber({ prefix: "INV", financialYear: "2026-27", branchCode: "MUM", sequence: 42 })).toBe("INV/MUM/2026-27/0042");
  });

  it("pads the sequence to the given width", () => {
    expect(buildDocumentNumber({ prefix: "RCPT", financialYear: "2026-27", sequence: 7, padWidth: 6 })).toBe("RCPT/2026-27/000007");
  });
});
