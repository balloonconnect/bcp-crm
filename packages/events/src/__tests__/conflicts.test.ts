import { describe, expect, it } from "vitest";
import {
  windowsOverlap,
  resolveEventWindow,
  detectTeamConflicts,
  detectEquipmentConflicts,
  detectDateTimeConflicts,
  detectTravelConflicts,
} from "../conflicts";

function win(startHour: number, endHour: number, day = "2026-08-01") {
  return { start: new Date(`${day}T${String(startHour).padStart(2, "0")}:00:00Z`), end: new Date(`${day}T${String(endHour).padStart(2, "0")}:00:00Z`) };
}

describe("windowsOverlap", () => {
  it("detects a genuine overlap", () => {
    expect(windowsOverlap(win(10, 14), win(12, 16))).toBe(true);
  });
  it("does not flag touching endpoints as overlapping", () => {
    expect(windowsOverlap(win(10, 12), win(12, 14))).toBe(false);
  });
  it("does not flag genuinely separate windows", () => {
    expect(windowsOverlap(win(9, 10), win(14, 16))).toBe(false);
  });
});

describe("resolveEventWindow", () => {
  it("uses the given end time when present", () => {
    const window = resolveEventWindow(new Date("2026-08-01T10:00:00Z"), new Date("2026-08-01T13:00:00Z"));
    expect(window.end.toISOString()).toBe("2026-08-01T13:00:00.000Z");
  });

  it("defaults to a 3-hour duration when no end time is given", () => {
    const window = resolveEventWindow(new Date("2026-08-01T10:00:00Z"), null);
    expect(window.end.toISOString()).toBe("2026-08-01T13:00:00.000Z");
  });
});

describe("detectTeamConflicts", () => {
  it("flags a team member already booked on an overlapping event", () => {
    const conflicts = detectTeamConflicts({
      window: win(10, 14),
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Wedding A", window: win(12, 16) }] }],
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.studioUserId).toBe("u1");
  });

  it("does not flag a team member with no overlapping events", () => {
    const conflicts = detectTeamConflicts({
      window: win(10, 14),
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Wedding A", window: win(15, 18) }] }],
    });
    expect(conflicts).toHaveLength(0);
  });

  it("excludes the event being edited from its own conflict check", () => {
    const conflicts = detectTeamConflicts({
      window: win(10, 14),
      excludeEventId: "e1",
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Wedding A", window: win(12, 16) }] }],
    });
    expect(conflicts).toHaveLength(0);
  });
});

describe("detectEquipmentConflicts", () => {
  it("does not flag demand within owned quantity", () => {
    const conflicts = detectEquipmentConflicts({
      window: win(10, 14),
      items: [{ equipmentId: "eq1", equipmentName: "Drone", ownedQuantity: 3, requestedQuantity: 1, existingBookings: [{ eventId: "e1", eventTitle: "Wedding A", window: win(12, 16), quantity: 1 }] }],
    });
    expect(conflicts).toHaveLength(0);
  });

  it("flags demand that exceeds owned quantity", () => {
    const conflicts = detectEquipmentConflicts({
      window: win(10, 14),
      items: [{ equipmentId: "eq1", equipmentName: "Drone", ownedQuantity: 1, requestedQuantity: 1, existingBookings: [{ eventId: "e1", eventTitle: "Wedding A", window: win(12, 16), quantity: 1 }] }],
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.equipmentName).toBe("Drone");
  });
});

describe("detectDateTimeConflicts", () => {
  it("flags any overlapping event regardless of resource assignment", () => {
    const conflicts = detectDateTimeConflicts({ window: win(10, 14), existingEvents: [{ eventId: "e1", eventTitle: "Other shoot", window: win(13, 15) }] });
    expect(conflicts).toHaveLength(1);
  });
});

describe("detectTravelConflicts", () => {
  it("does not flag back-to-back events at the same venue", () => {
    const conflicts = detectTravelConflicts({
      window: win(14, 16),
      venue: "Taj Hotel",
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Ceremony", window: win(10, 14), venue: "Taj Hotel" }] }],
    });
    expect(conflicts).toHaveLength(0);
  });

  it("flags back-to-back events at different venues without enough travel buffer", () => {
    const conflicts = detectTravelConflicts({
      window: win(14, 16),
      venue: "Beach Resort",
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Ceremony", window: win(10, 14), venue: "Taj Hotel" }] }],
    });
    expect(conflicts).toHaveLength(1);
  });

  it("does not flag different-venue events with enough gap between them", () => {
    const conflicts = detectTravelConflicts({
      window: win(18, 20),
      venue: "Beach Resort",
      bufferMinutes: 60,
      assignments: [{ studioUserId: "u1", studioUserName: "Asha", existingEvents: [{ eventId: "e1", eventTitle: "Ceremony", window: win(10, 14), venue: "Taj Hotel" }] }],
    });
    expect(conflicts).toHaveLength(0);
  });
});
