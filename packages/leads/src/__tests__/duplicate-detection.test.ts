import { describe, expect, it } from "vitest";
import { findDuplicates, type ExistingLeadForMatching } from "../duplicate-detection";

const existing: ExistingLeadForMatching[] = [
  { id: "1", name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@example.com", instagramProfile1: "@priya.weds" },
  { id: "2", name: "The Iyer Family", phone: "9123456789", email: null, instagramProfile1: null },
  { id: "3", name: "Unrelated Lead", phone: "9000000000", email: "unrelated@example.com" },
];

describe("findDuplicates", () => {
  it("matches on phone regardless of formatting", () => {
    const matches = findDuplicates({ phone: "09876543210" }, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.lead.id).toBe("1");
    expect(matches[0]!.matchedOn).toContain("phone");
    expect(matches[0]!.confidence).toBe("high");
  });

  it("matches on email case-insensitively", () => {
    const matches = findDuplicates({ email: "PRIYA@EXAMPLE.COM" }, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.lead.id).toBe("1");
  });

  it("matches on Instagram handle regardless of @ or URL form", () => {
    const matches = findDuplicates({ instagramProfile1: "https://instagram.com/priya.weds/" }, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.matchedOn).toContain("instagram");
    expect(matches[0]!.confidence).toBe("medium");
  });

  it("returns no matches for a genuinely new lead", () => {
    expect(findDuplicates({ phone: "9999999999", email: "new@example.com" }, existing)).toHaveLength(0);
  });

  it("sorts high-confidence matches before medium-confidence ones", () => {
    const matches = findDuplicates({ phone: "9876543210", instagramProfile1: "priya.weds" }, existing);
    expect(matches[0]!.confidence).toBe("high");
  });
});
