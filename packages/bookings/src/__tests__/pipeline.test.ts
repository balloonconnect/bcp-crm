import { describe, expect, it } from "vitest";
import { BOOKING_STAGES, BOOKING_STATUS_KEYS, getBookingStage, isClosedBookingStatus, canTransition, getNextStage, WORKFLOW_STAGE_KEYS } from "../pipeline";

describe("BOOKING_STAGES", () => {
  it("has exactly the 11 statuses named in the brief", () => {
    expect(BOOKING_STAGES.length).toBe(11);
  });

  it("has unique keys and sequential order", () => {
    expect(new Set(BOOKING_STATUS_KEYS).size).toBe(11);
    const orders = BOOKING_STAGES.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
  });

  it("only completed and cancelled are closed", () => {
    const closed = BOOKING_STAGES.filter((s) => s.kind === "closed").map((s) => s.key).sort();
    expect(closed).toEqual(["cancelled", "completed"]);
  });

  it("getBookingStage throws for an unknown status", () => {
    expect(() => getBookingStage("bogus" as never)).toThrow();
  });
});

describe("isClosedBookingStatus / canTransition", () => {
  it("treats completed and cancelled as closed and non-transitionable", () => {
    expect(isClosedBookingStatus("completed")).toBe(true);
    expect(canTransition("completed")).toBe(false);
    expect(canTransition("cancelled")).toBe(false);
  });

  it("allows transitioning from any open status", () => {
    expect(canTransition("draft")).toBe(true);
    expect(canTransition("printing")).toBe(true);
  });
});

describe("getNextStage", () => {
  it("returns the immediately following open stage", () => {
    expect(getNextStage("draft")).toBe("awaiting_advance");
    expect(getNextStage("confirmed")).toBe("in_progress");
  });

  it("returns null once closed", () => {
    expect(getNextStage("completed")).toBeNull();
    expect(getNextStage("cancelled")).toBeNull();
  });

  it("returns null after the last open stage (delivery)", () => {
    expect(getNextStage("delivery")).toBeNull();
  });
});

describe("WORKFLOW_STAGE_KEYS", () => {
  it("excludes cancelled but includes completed", () => {
    expect(WORKFLOW_STAGE_KEYS).not.toContain("cancelled");
    expect(WORKFLOW_STAGE_KEYS).toContain("completed");
    expect(WORKFLOW_STAGE_KEYS.length).toBe(10);
  });
});
