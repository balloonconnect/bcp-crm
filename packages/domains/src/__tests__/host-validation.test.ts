import { describe, expect, it } from "vitest";
import { validateHostHeader } from "../host-validation";

describe("validateHostHeader", () => {
  it("accepts a normal hostname", () => {
    expect(validateHostHeader("studio.example.com")).toEqual({ ok: true, hostname: "studio.example.com" });
  });

  it("lowercases the hostname", () => {
    expect(validateHostHeader("Studio.Example.COM")).toEqual({ ok: true, hostname: "studio.example.com" });
  });

  it("strips a valid port suffix", () => {
    expect(validateHostHeader("studio.example.com:4000")).toEqual({ ok: true, hostname: "studio.example.com" });
  });

  it("rejects a missing host", () => {
    expect(validateHostHeader(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(validateHostHeader("")).toEqual({ ok: false, reason: "missing" });
    expect(validateHostHeader("   ")).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects multiple Host headers (array form)", () => {
    expect(validateHostHeader(["a.com", "b.com"])).toEqual({ ok: false, reason: "multiple_headers" });
  });

  it("rejects a userinfo-prefixed host (injection attempt)", () => {
    expect(validateHostHeader("attacker.com@studio.example.com")).toEqual({
      ok: false,
      reason: "userinfo_present",
    });
  });

  it("rejects control characters and embedded whitespace", () => {
    expect(validateHostHeader("studio.example.com\r\nX-Injected: true")).toEqual({
      ok: false,
      reason: "invalid_characters",
    });
    expect(validateHostHeader("studio .example.com")).toEqual({ ok: false, reason: "invalid_characters" });
  });

  it("rejects a single label that's too long", () => {
    const tooLongLabel = "a".repeat(64) + ".example.com";
    expect(validateHostHeader(tooLongLabel)).toEqual({ ok: false, reason: "invalid_label" });
  });

  it("rejects a hostname that's too long overall", () => {
    const tooLong = Array.from({ length: 30 }, () => "abcde").join(".") + ".com";
    expect(validateHostHeader(tooLong).ok).toBe(false);
  });

  it("rejects an invalid port", () => {
    expect(validateHostHeader("studio.example.com:notaport")).toEqual({
      ok: false,
      reason: "invalid_characters",
    });
    expect(validateHostHeader("studio.example.com:99999")).toEqual({ ok: false, reason: "invalid_port" });
  });

  it("rejects bare IPv4 literals by default", () => {
    expect(validateHostHeader("192.168.1.1")).toEqual({ ok: false, reason: "ip_literal_not_allowed" });
  });

  it("allows IPv4 literals when explicitly permitted", () => {
    expect(validateHostHeader("192.168.1.1", { disallowIpLiterals: false })).toEqual({
      ok: true,
      hostname: "192.168.1.1",
    });
  });

  it("rejects IPv6 literals by default", () => {
    expect(validateHostHeader("[::1]")).toEqual({ ok: false, reason: "ip_literal_not_allowed" });
  });

  it("rejects a label starting or ending with a hyphen", () => {
    expect(validateHostHeader("-studio.example.com")).toEqual({ ok: false, reason: "invalid_label" });
    expect(validateHostHeader("studio-.example.com")).toEqual({ ok: false, reason: "invalid_label" });
  });

  it("rejects an empty label (double dot)", () => {
    expect(validateHostHeader("studio..example.com")).toEqual({ ok: false, reason: "empty_label" });
  });

  it("rejects characters outside the hostname charset", () => {
    expect(validateHostHeader("studio_example.com")).toEqual({ ok: false, reason: "invalid_characters" });
    expect(validateHostHeader("studio.example.com/../../etc")).toEqual({
      ok: false,
      reason: "invalid_characters",
    });
  });
});
