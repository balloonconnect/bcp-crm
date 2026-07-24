import { describe, expect, it } from "vitest";
import { SAMPLE_SERVICES, SAMPLE_PACKAGES, SAMPLE_CUSTOMERS } from "../sample-data";

describe("sample data", () => {
  it("provides at least one sample service, package, and customer", () => {
    expect(SAMPLE_SERVICES.length).toBeGreaterThan(0);
    expect(SAMPLE_PACKAGES.length).toBeGreaterThan(0);
    expect(SAMPLE_CUSTOMERS.length).toBeGreaterThan(0);
  });

  it("every sample package only references sample services that exist", () => {
    const serviceNames = new Set(SAMPLE_SERVICES.map((s) => s.name));
    for (const pkg of SAMPLE_PACKAGES) {
      for (const name of pkg.serviceNames) {
        expect(serviceNames.has(name)).toBe(true);
      }
    }
  });

  it("every sample customer has a name, email, and phone", () => {
    for (const customer of SAMPLE_CUSTOMERS) {
      expect(customer.name.length).toBeGreaterThan(0);
      expect(customer.email).toContain("@");
      expect(customer.phone.length).toBeGreaterThan(0);
    }
  });
});
