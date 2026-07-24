import { describe, expect, it } from "vitest";
import { evaluateLockout, isLocked, assertNotLocked, AccountLockedError, LOCKOUT_THRESHOLD } from "../lockout";

describe("evaluateLockout", () => {
  it("does not lock below the threshold", () => {
    const result = evaluateLockout(LOCKOUT_THRESHOLD - 1);
    expect(result.shouldLock).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });

  it("locks at the threshold", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = evaluateLockout(LOCKOUT_THRESHOLD, now);
    expect(result.shouldLock).toBe(true);
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("escalates the lock duration with repeated failures", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const first = evaluateLockout(LOCKOUT_THRESHOLD, now);
    const second = evaluateLockout(LOCKOUT_THRESHOLD + 1, now);
    const third = evaluateLockout(LOCKOUT_THRESHOLD + 2, now);
    const firstDuration = first.lockedUntil!.getTime() - now.getTime();
    const secondDuration = second.lockedUntil!.getTime() - now.getTime();
    const thirdDuration = third.lockedUntil!.getTime() - now.getTime();
    expect(secondDuration).toBeGreaterThan(firstDuration);
    expect(thirdDuration).toBeGreaterThan(secondDuration);
  });

  it("caps escalation rather than growing unbounded", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const farFuture = evaluateLockout(LOCKOUT_THRESHOLD + 50, now);
    const cappedAt = evaluateLockout(LOCKOUT_THRESHOLD + 3, now);
    expect(farFuture.lockedUntil!.getTime()).toBe(cappedAt.lockedUntil!.getTime());
  });
});

describe("isLocked / assertNotLocked", () => {
  it("is not locked when lockedUntil is null", () => {
    expect(isLocked(null)).toBe(false);
  });

  it("is locked when lockedUntil is in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const future = new Date(now.getTime() + 60_000);
    expect(isLocked(future, now)).toBe(true);
  });

  it("is not locked once lockedUntil has passed", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const past = new Date(now.getTime() - 60_000);
    expect(isLocked(past, now)).toBe(false);
  });

  it("assertNotLocked throws AccountLockedError while locked", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const future = new Date(now.getTime() + 60_000);
    expect(() => assertNotLocked(future, now)).toThrow(AccountLockedError);
  });

  it("assertNotLocked does not throw once unlocked", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const past = new Date(now.getTime() - 60_000);
    expect(() => assertNotLocked(past, now)).not.toThrow();
  });
});
