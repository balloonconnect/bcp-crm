import { describe, expect, it } from "vitest";
import { canSendTo } from "../consent";

describe("canSendTo", () => {
  it("allows sending to an opted-in number", () => {
    expect(canSendTo("opted_in")).toBe(true);
  });

  it("allows sending to an unknown-consent number", () => {
    expect(canSendTo("unknown")).toBe(true);
  });

  it("blocks sending to an opted-out number", () => {
    expect(canSendTo("opted_out")).toBe(false);
  });
});
