import { describe, expect, it } from "vitest";
import { eventInputSchema, equipmentInputSchema } from "../validation";

describe("eventInputSchema", () => {
  it("accepts a minimal event", () => {
    expect(eventInputSchema.safeParse({ title: "Ananya & Rohit Wedding", eventType: "Wedding", scheduledAt: new Date().toISOString() }).success).toBe(true);
  });

  it("accepts a fully populated event", () => {
    const result = eventInputSchema.safeParse({
      title: "Wedding",
      eventType: "Wedding",
      scheduledAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      venue: "Taj Hotel",
      latitude: 12.9,
      longitude: 77.6,
      assignedUserIds: ["00000000-0000-0000-0000-000000000000"],
      equipment: [{ equipmentId: "00000000-0000-0000-0000-000000000000", quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range latitude", () => {
    expect(eventInputSchema.safeParse({ title: "X", eventType: "Wedding", scheduledAt: new Date().toISOString(), latitude: 200 }).success).toBe(false);
  });
});

describe("equipmentInputSchema", () => {
  it("defaults quantity to 1", () => {
    const result = equipmentInputSchema.parse({ name: "Drone" });
    expect(result.quantity).toBe(1);
  });
});
