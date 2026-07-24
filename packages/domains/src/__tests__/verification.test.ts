import { describe, expect, it } from "vitest";
import { verifyTxtRecord, verifyCnameRecord, evaluateVerification } from "../verification";

describe("verifyTxtRecord", () => {
  it("matches when a TXT record's joined chunks equal the expected token", () => {
    expect(verifyTxtRecord("abc123", [["abc123"]])).toBe(true);
  });

  it("joins multi-chunk TXT records before comparing", () => {
    expect(verifyTxtRecord("abc123", [["abc", "123"]])).toBe(true);
  });

  it("matches if any of several TXT records match", () => {
    expect(verifyTxtRecord("abc123", [["unrelated"], ["abc123"]])).toBe(true);
  });

  it("does not match when nothing lines up", () => {
    expect(verifyTxtRecord("abc123", [["nope"]])).toBe(false);
  });
});

describe("verifyCnameRecord", () => {
  it("matches ignoring case and trailing dot", () => {
    expect(verifyCnameRecord("domains.bcpstudio.os", ["Domains.BCPStudio.OS."])).toBe(true);
  });

  it("does not match an unrelated CNAME", () => {
    expect(verifyCnameRecord("domains.bcpstudio.os", ["somewhere-else.com"])).toBe(false);
  });
});

describe("evaluateVerification", () => {
  it("reports dns_lookup_failed when the lookup itself failed", () => {
    expect(evaluateVerification({ method: "txt", expectedValue: "x", lookupResult: null })).toEqual({
      verified: false,
      reason: "dns_lookup_failed",
    });
  });

  it("reports no_matching_record when the lookup succeeded but nothing matches", () => {
    expect(
      evaluateVerification({ method: "txt", expectedValue: "x", lookupResult: [["y"]] }),
    ).toEqual({ verified: false, reason: "no_matching_record" });
  });

  it("reports verified: true on a match", () => {
    expect(evaluateVerification({ method: "txt", expectedValue: "x", lookupResult: [["x"]] })).toEqual({
      verified: true,
    });
  });

  it("dispatches to CNAME comparison for method 'cname'", () => {
    expect(
      evaluateVerification({ method: "cname", expectedValue: "target.com", lookupResult: ["target.com"] }),
    ).toEqual({ verified: true });
  });
});
