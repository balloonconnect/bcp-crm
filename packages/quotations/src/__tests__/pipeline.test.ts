import { describe, expect, it } from "vitest";
import { QUOTATION_STAGES, QUOTATION_STATUS_KEYS, getQuotationStage, isClosedQuotationStatus, canTransition } from "../pipeline";

describe("QUOTATION_STAGES", () => {
  it("has exactly the 7 statuses named in the brief", () => {
    expect(QUOTATION_STAGES.length).toBe(7);
  });

  it("has unique keys", () => {
    expect(new Set(QUOTATION_STATUS_KEYS).size).toBe(7);
  });

  it("getQuotationStage throws for an unknown status", () => {
    expect(() => getQuotationStage("bogus" as never)).toThrow();
  });

  it("only rejected, expired, and converted are closed", () => {
    const closed = QUOTATION_STAGES.filter((s) => s.kind === "closed").map((s) => s.key).sort();
    expect(closed).toEqual(["converted", "expired", "rejected"]);
  });
});

describe("isClosedQuotationStatus", () => {
  it("treats converted as closed", () => {
    expect(isClosedQuotationStatus("converted")).toBe(true);
  });
  it("treats draft as open", () => {
    expect(isClosedQuotationStatus("draft")).toBe(false);
  });
});

describe("canTransition", () => {
  it("allows draft to sent", () => {
    expect(canTransition("draft", "sent")).toBe(true);
  });
  it("disallows a terminal rejected quotation from transitioning anywhere", () => {
    expect(canTransition("rejected", "sent")).toBe(false);
    expect(canTransition("rejected", "accepted")).toBe(false);
  });
  it("allows re-sending an expired quotation", () => {
    expect(canTransition("expired", "sent")).toBe(true);
  });
  it("allows converting an accepted quotation into a booking", () => {
    expect(canTransition("accepted", "converted")).toBe(true);
  });
  it("disallows skipping straight from draft to accepted", () => {
    expect(canTransition("draft", "accepted")).toBe(false);
  });
});
