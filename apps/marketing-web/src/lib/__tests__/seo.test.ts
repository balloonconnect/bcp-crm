import { describe, expect, it } from "vitest";
import { buildMetadata, organizationJsonLd, softwareApplicationJsonLd, faqPageJsonLd, breadcrumbJsonLd } from "../seo";

describe("buildMetadata", () => {
  it("builds a title with the site name suffix and a canonical URL", () => {
    const metadata = buildMetadata({ title: "Pricing", description: "Flat pricing.", path: "/pricing" });
    expect(metadata.title).toBe("Pricing — BCP Studio OS");
    expect(metadata.alternates?.canonical).toContain("/pricing");
  });

  it("defaults to indexable", () => {
    const metadata = buildMetadata({ title: "Home", description: "d", path: "/" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("respects index: false", () => {
    const metadata = buildMetadata({ title: "Log in", description: "d", path: "/login", index: false });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("JSON-LD builders", () => {
  it("organizationJsonLd produces a valid Organization schema", () => {
    const data = organizationJsonLd();
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("BCP Studio OS");
  });

  it("softwareApplicationJsonLd includes pricing info", () => {
    const data = softwareApplicationJsonLd();
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.offers).toBeDefined();
  });

  it("faqPageJsonLd maps each FAQ to a Question entity", () => {
    const data = faqPageJsonLd([{ question: "Q1?", answer: "A1." }]);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(1);
    const entity = data.mainEntity[0]!;
    expect(entity["@type"]).toBe("Question");
    expect(entity.acceptedAnswer.text).toBe("A1.");
  });

  it("breadcrumbJsonLd assigns sequential positions", () => {
    const data = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]);
    expect(data.itemListElement[0]!.position).toBe(1);
    expect(data.itemListElement[1]!.position).toBe(2);
  });
});
