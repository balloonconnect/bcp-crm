import { describe, expect, it } from "vitest";
import { CONFIGURABLE_FIELD_KEYS, defaultFieldsConfig, getFieldVisibility, getRequiredFieldKeys, getVisibleFieldKeys, formFieldsConfigSchema } from "../field-config";

describe("defaultFieldsConfig", () => {
  it("defaults every configurable field to optional", () => {
    const config = defaultFieldsConfig();
    for (const key of CONFIGURABLE_FIELD_KEYS) {
      expect(config[key]).toBe("optional");
    }
  });
});

describe("getFieldVisibility / getRequiredFieldKeys / getVisibleFieldKeys", () => {
  it("treats an unconfigured field as optional", () => {
    expect(getFieldVisibility({}, "phone")).toBe("optional");
  });

  it("returns only required fields", () => {
    const config = { phone: "required" as const, email: "hidden" as const, city: "optional" as const };
    expect(getRequiredFieldKeys(config)).toEqual(["phone"]);
  });

  it("excludes hidden fields from visible fields", () => {
    const config = { phone: "required" as const, email: "hidden" as const };
    const visible = getVisibleFieldKeys(config);
    expect(visible).toContain("phone");
    expect(visible).not.toContain("email");
  });
});

describe("formFieldsConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(formFieldsConfigSchema.safeParse({ phone: "required", budget: "hidden" }).success).toBe(true);
  });

  it("rejects an unknown field key", () => {
    expect(formFieldsConfigSchema.safeParse({ assignedTo: "required" }).success).toBe(false);
  });

  it("rejects an invalid visibility value", () => {
    expect(formFieldsConfigSchema.safeParse({ phone: "mandatory" }).success).toBe(false);
  });
});
