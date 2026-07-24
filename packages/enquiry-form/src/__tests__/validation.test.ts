import { describe, expect, it } from "vitest";
import { validateSubmissionPayload, enquiryFormConfigSchema } from "../validation";

describe("validateSubmissionPayload", () => {
  it("rejects a submission with no name", () => {
    const result = validateSubmissionPayload({}, {}, true, true);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name is required.");
  });

  it("accepts a submission with just a name when nothing else is required", () => {
    const result = validateSubmissionPayload({ name: "Ananya" }, {}, true, true);
    expect(result.valid).toBe(true);
  });

  it("rejects when a configured-required field is missing", () => {
    const result = validateSubmissionPayload({ name: "Ananya" }, { phone: "required" }, true, true);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("phone"))).toBe(true);
  });

  it("rejects when consent is required but not given", () => {
    const result = validateSubmissionPayload({ name: "Ananya" }, {}, false, true);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("consent"))).toBe(true);
  });

  it("does not require consent when the form doesn't require it", () => {
    const result = validateSubmissionPayload({ name: "Ananya" }, {}, false, false);
    expect(result.valid).toBe(true);
  });

  it("treats an empty-string required field as missing", () => {
    const result = validateSubmissionPayload({ name: "Ananya", phone: "   " }, { phone: "required" }, true, true);
    expect(result.valid).toBe(false);
  });
});

describe("enquiryFormConfigSchema", () => {
  it("accepts a minimal valid config", () => {
    const result = enquiryFormConfigSchema.safeParse({ slug: "wedding-enquiries", title: "Wedding enquiries" });
    expect(result.success).toBe(true);
  });

  it("rejects an uppercase slug", () => {
    expect(enquiryFormConfigSchema.safeParse({ slug: "Wedding-Enquiries", title: "X" }).success).toBe(false);
  });

  it("defaults contactMethods to phone and email", () => {
    const result = enquiryFormConfigSchema.parse({ slug: "general", title: "General enquiries" });
    expect(result.contactMethods).toEqual(["phone", "email"]);
  });
});
