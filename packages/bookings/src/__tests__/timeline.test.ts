import { describe, expect, it } from "vitest";
import { BOOKING_TIMELINE_EVENT_TYPES, getBookingTimelineEventLabel } from "../timeline";

describe("BOOKING_TIMELINE_EVENT_TYPES", () => {
  it("has unique keys", () => {
    const keys = BOOKING_TIMELINE_EVENT_TYPES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("getBookingTimelineEventLabel resolves a known type", () => {
    expect(getBookingTimelineEventLabel("payment")).toBe("Payment");
  });

  it("falls back to the raw key for an unknown type", () => {
    expect(getBookingTimelineEventLabel("bogus" as never)).toBe("bogus");
  });
});
