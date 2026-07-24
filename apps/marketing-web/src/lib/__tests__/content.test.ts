import { describe, expect, it } from "vitest";
import { KEY_SECTIONS, PRIMARY_NAV, FOOTER_NAV, GENERAL_FAQS, getKeySection } from "../content";

describe("KEY_SECTIONS", () => {
  it("has exactly the 11 key sections named in the brief", () => {
    expect(KEY_SECTIONS.length).toBe(11);
  });

  it("has unique slugs and frame numbers", () => {
    const slugs = KEY_SECTIONS.map((s) => s.slug);
    const frameNumbers = KEY_SECTIONS.map((s) => s.frameNumber);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(frameNumbers).size).toBe(frameNumbers.length);
  });

  it("every section has a pageHref that starts with /", () => {
    for (const section of KEY_SECTIONS) {
      expect(section.pageHref.startsWith("/")).toBe(true);
    }
  });

  it("getKeySection returns the matching section", () => {
    expect(getKeySection("crm").name).toBe("Complete Studio CRM");
  });

  it("getKeySection throws for an unknown slug", () => {
    expect(() => getKeySection("not-a-section")).toThrow();
  });
});

describe("navigation", () => {
  it("every primary nav link has a non-empty label and href", () => {
    for (const link of PRIMARY_NAV) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.href.startsWith("/")).toBe(true);
    }
  });

  it("footer nav covers legal pages", () => {
    const allHrefs = FOOTER_NAV.flatMap((group) => group.links.map((l) => l.href));
    expect(allHrefs).toContain("/privacy");
    expect(allHrefs).toContain("/terms");
    expect(allHrefs).toContain("/refund-policy");
  });
});

describe("GENERAL_FAQS", () => {
  it("has at least 5 questions, each with a non-empty answer", () => {
    expect(GENERAL_FAQS.length).toBeGreaterThanOrEqual(5);
    for (const faq of GENERAL_FAQS) {
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer.length).toBeGreaterThan(0);
    }
  });
});
