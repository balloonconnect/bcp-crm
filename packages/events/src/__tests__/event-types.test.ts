import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "../event-types";

describe("EVENT_TYPES", () => {
  it("has exactly the 13 types named in the brief", () => {
    expect(EVENT_TYPES.length).toBe(13);
  });

  it("has unique values", () => {
    expect(new Set(EVENT_TYPES).size).toBe(13);
  });

  it("includes Custom as the catch-all", () => {
    expect(EVENT_TYPES).toContain("Custom");
  });
});
