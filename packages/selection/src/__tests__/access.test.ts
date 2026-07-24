import { describe, expect, it } from "vitest";
import { checkAlbumAccess, isPastDeadline, daysUntilDeadline } from "../access";

describe("checkAlbumAccess", () => {
  it("grants access when OTP isn't required", () => {
    expect(checkAlbumAccess(false, false)).toBe("granted");
  });

  it("requires OTP when required and not yet verified", () => {
    expect(checkAlbumAccess(true, false)).toBe("needs_otp");
  });

  it("grants access once OTP is verified", () => {
    expect(checkAlbumAccess(true, true)).toBe("granted");
  });
});

describe("isPastDeadline", () => {
  const now = new Date("2026-08-01T00:00:00Z");

  it("returns false with no deadline set", () => {
    expect(isPastDeadline(null, now)).toBe(false);
  });

  it("returns true once past the deadline", () => {
    expect(isPastDeadline(new Date("2026-07-01"), now)).toBe(true);
  });

  it("returns false before the deadline", () => {
    expect(isPastDeadline(new Date("2026-09-01"), now)).toBe(false);
  });
});

describe("daysUntilDeadline", () => {
  it("returns null with no deadline", () => {
    expect(daysUntilDeadline(null)).toBeNull();
  });

  it("returns a positive count before the deadline", () => {
    const now = new Date("2026-08-01T00:00:00Z");
    expect(daysUntilDeadline(new Date("2026-08-05T00:00:00Z"), now)).toBe(4);
  });

  it("returns a negative count past the deadline", () => {
    const now = new Date("2026-08-10T00:00:00Z");
    expect(daysUntilDeadline(new Date("2026-08-05T00:00:00Z"), now)).toBeLessThan(0);
  });
});
