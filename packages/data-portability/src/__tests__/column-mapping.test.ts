import { describe, expect, it } from "vitest";
import { applyColumnMapping, suggestColumnMapping } from "../column-mapping";

describe("applyColumnMapping", () => {
  it("remaps a raw record's keys per the mapping", () => {
    expect(applyColumnMapping({ "Full Name": "Asha", "Mobile": "+91123" }, { "Full Name": "name", "Mobile": "phone" })).toEqual({ name: "Asha", phone: "+91123" });
  });

  it("omits an entity field with no corresponding CSV column present", () => {
    expect(applyColumnMapping({ "Full Name": "Asha" }, { "Full Name": "name", "Missing Col": "phone" })).toEqual({ name: "Asha" });
  });
});

describe("suggestColumnMapping", () => {
  it("auto-matches a header equal to a field key or label, ignoring case/spacing", () => {
    const mapping = suggestColumnMapping(["Name", "event_type"], [{ key: "name", label: "Name" }, { key: "eventType", label: "Event Type" }]);
    expect(mapping).toEqual({ Name: "name", event_type: "eventType" });
  });

  it("leaves an unrecognized header unmapped", () => {
    const mapping = suggestColumnMapping(["Random Column"], [{ key: "name", label: "Name" }]);
    expect(mapping["Random Column"]).toBeUndefined();
  });
});
