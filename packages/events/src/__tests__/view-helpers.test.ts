import { describe, expect, it } from "vitest";
import { groupEventsForAgenda, groupEventsForKanban } from "../view-helpers";

describe("groupEventsForAgenda", () => {
  const events = [
    { id: "1", scheduledAt: new Date("2026-08-02T14:00:00Z"), status: "confirmed" },
    { id: "2", scheduledAt: new Date("2026-08-01T10:00:00Z"), status: "confirmed" },
    { id: "3", scheduledAt: new Date("2026-08-01T09:00:00Z"), status: "confirmed" },
  ];

  it("groups events by calendar day", () => {
    const groups = groupEventsForAgenda(events);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.dateKey).toBe("2026-08-01");
    expect(groups[0]!.events).toHaveLength(2);
  });

  it("sorts days chronologically and events within a day by start time", () => {
    const groups = groupEventsForAgenda(events);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["3", "2"]);
    expect(groups[1]!.dateKey).toBe("2026-08-02");
  });
});

describe("groupEventsForKanban", () => {
  it("groups by status in the given column order", () => {
    const events = [
      { id: "1", scheduledAt: new Date(), status: "confirmed" },
      { id: "2", scheduledAt: new Date(), status: "enquiry" },
    ];
    const columns = groupEventsForKanban(events, ["enquiry", "confirmed", "completed"]);
    expect(columns.map((c) => c.status)).toEqual(["enquiry", "confirmed", "completed"]);
    expect(columns[0]!.events).toHaveLength(1);
    expect(columns[2]!.events).toHaveLength(0);
  });
});
