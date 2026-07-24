import { describe, expect, it } from "vitest";
import { checkCheckoutConflict } from "../checkout";

describe("checkCheckoutConflict", () => {
  const now = new Date("2026-07-14T00:00:00Z");

  it("allows a checkout when nothing else is out", () => {
    const result = checkCheckoutConflict({ equipmentId: "e1", requestedFrom: new Date("2026-07-14"), requestedUntil: new Date("2026-07-15"), ownedQuantity: 1 }, [], now);
    expect(result.hasConflict).toBe(false);
  });

  it("flags a conflict when the sole unit is already checked out over an overlapping window", () => {
    const existing = [{ id: "c1", checkedOutAt: new Date("2026-07-13"), expectedReturnAt: new Date("2026-07-16"), checkedInAt: null }];
    const result = checkCheckoutConflict({ equipmentId: "e1", requestedFrom: new Date("2026-07-14"), requestedUntil: new Date("2026-07-15"), ownedQuantity: 1 }, existing, now);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingCheckoutIds).toEqual(["c1"]);
  });

  it("allows concurrent checkouts up to owned quantity", () => {
    const existing = [
      { id: "c1", checkedOutAt: new Date("2026-07-13"), expectedReturnAt: new Date("2026-07-16"), checkedInAt: null },
      { id: "c2", checkedOutAt: new Date("2026-07-13"), expectedReturnAt: new Date("2026-07-16"), checkedInAt: null },
    ];
    const result = checkCheckoutConflict({ equipmentId: "e1", requestedFrom: new Date("2026-07-14"), requestedUntil: new Date("2026-07-15"), ownedQuantity: 3 }, existing, now);
    expect(result.hasConflict).toBe(false);
  });

  it("ignores an already-checked-in record", () => {
    const existing = [{ id: "c1", checkedOutAt: new Date("2026-07-13"), expectedReturnAt: new Date("2026-07-16"), checkedInAt: new Date("2026-07-13T12:00:00Z") }];
    const result = checkCheckoutConflict({ equipmentId: "e1", requestedFrom: new Date("2026-07-14"), requestedUntil: new Date("2026-07-15"), ownedQuantity: 1 }, existing, now);
    expect(result.hasConflict).toBe(false);
  });

  it("treats an open-ended checkout (no expected return) as ongoing and conflicting", () => {
    const existing = [{ id: "c1", checkedOutAt: new Date("2026-07-01"), expectedReturnAt: null, checkedInAt: null }];
    const result = checkCheckoutConflict({ equipmentId: "e1", requestedFrom: new Date("2026-07-10"), requestedUntil: new Date("2026-07-15"), ownedQuantity: 1 }, existing, now);
    expect(result.hasConflict).toBe(true);
  });
});
