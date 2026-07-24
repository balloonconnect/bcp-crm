import { describe, expect, it } from "vitest";
import { resolveExpiryUrgency, findExpiringEquipment } from "../expiry";

describe("resolveExpiryUrgency", () => {
  const now = new Date("2026-07-14T00:00:00Z");

  it("returns none for no expiry date", () => {
    expect(resolveExpiryUrgency(null, now)).toBe("none");
  });

  it("returns none for a far-future expiry", () => {
    expect(resolveExpiryUrgency(new Date("2027-01-01"), now)).toBe("none");
  });

  it("returns expiring_soon within the 30-day window", () => {
    expect(resolveExpiryUrgency(new Date("2026-07-25"), now)).toBe("expiring_soon");
  });

  it("returns expired for a past date", () => {
    expect(resolveExpiryUrgency(new Date("2026-07-01"), now)).toBe("expired");
  });
});

describe("findExpiringEquipment", () => {
  const now = new Date("2026-07-14T00:00:00Z");

  it("flags both warranty and insurance when both are expiring", () => {
    const items = [{ id: "e1", name: "Camera A", warrantyExpiresAt: new Date("2026-07-01"), insuranceExpiresAt: new Date("2026-07-20") }];
    const flags = findExpiringEquipment(items, now);
    expect(flags.length).toBe(2);
    expect(flags.map((f) => f.type).sort()).toEqual(["insurance", "warranty"]);
  });

  it("skips equipment with no expiry concerns", () => {
    const items = [{ id: "e1", name: "Camera A", warrantyExpiresAt: new Date("2028-01-01"), insuranceExpiresAt: null }];
    expect(findExpiringEquipment(items, now)).toEqual([]);
  });
});
