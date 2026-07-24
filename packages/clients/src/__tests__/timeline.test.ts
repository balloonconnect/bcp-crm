import { describe, expect, it } from "vitest";
import { TIMELINE_EVENT_TYPES, TIMELINE_EVENT_TYPE_KEYS, getTimelineEventTypeLabel } from "../timeline";

describe("TIMELINE_EVENT_TYPES", () => {
  it("has exactly the 15 event types named in the brief", () => {
    expect(TIMELINE_EVENT_TYPES.length).toBe(15);
  });

  it("has unique keys", () => {
    expect(new Set(TIMELINE_EVENT_TYPE_KEYS).size).toBe(15);
  });

  it("getTimelineEventTypeLabel resolves a known type", () => {
    expect(getTimelineEventTypeLabel("payment")).toBe("Payment");
  });

  it("getTimelineEventTypeLabel falls back to the key for an unknown type", () => {
    expect(getTimelineEventTypeLabel("bogus" as never)).toBe("bogus");
  });
});
