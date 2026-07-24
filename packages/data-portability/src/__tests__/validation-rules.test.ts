import { describe, expect, it } from "vitest";
import { validateRow } from "../validation-rules";
import { getImportFields } from "../import-fields";

describe("validateRow", () => {
  const leadFields = getImportFields("leads");

  it("passes a valid row", () => {
    const result = validateRow({ name: "Asha", phone: "+919876543210", email: "asha@example.com" }, leadFields);
    expect(result.valid).toBe(true);
  });

  it("flags a missing required field", () => {
    const result = validateRow({ email: "asha@example.com" }, leadFields);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Name"))).toBe(true);
  });

  it("flags an invalid email without blocking on the first error", () => {
    const result = validateRow({ name: "Asha", phone: "+919876543210", email: "not-an-email" }, leadFields);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("email"))).toBe(true);
  });

  it("collects multiple errors from one row", () => {
    const result = validateRow({ email: "not-an-email" }, leadFields);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
