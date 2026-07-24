import { describe, expect, it } from "vitest";
import { canSendTo } from "../unsubscribe";

describe("canSendTo", () => {
  it("allows sending when not unsubscribed", () => {
    expect(canSendTo(false)).toBe(true);
  });

  it("blocks sending when unsubscribed", () => {
    expect(canSendTo(true)).toBe(false);
  });
});
