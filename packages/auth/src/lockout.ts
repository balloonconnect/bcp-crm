/**
 * Progressive lockout: the lock duration grows with repeated failures
 * within the same lockout "episode" (tracked by the caller resetting
 * `failedLoginAttempts` to 0 on every successful login), so a persistent
 * attacker faces longer waits, but a genuine typo doesn't lock someone out
 * for long.
 */
export const LOCKOUT_THRESHOLD = 5; // failed attempts before the first lock
const LOCKOUT_DURATIONS_MINUTES = [5, 15, 60, 24 * 60]; // 5m, 15m, 1h, 24h — repeats at 24h thereafter

export interface LockoutDecision {
  shouldLock: boolean;
  lockedUntil: Date | null;
}

/**
 * Called after recording a failed login attempt (i.e. `failedAttempts`
 * already includes this one). Returns whether the account should now be
 * locked and until when.
 */
export function evaluateLockout(failedAttempts: number, now: Date = new Date()): LockoutDecision {
  if (failedAttempts < LOCKOUT_THRESHOLD) {
    return { shouldLock: false, lockedUntil: null };
  }

  const escalationStep = Math.min(
    failedAttempts - LOCKOUT_THRESHOLD,
    LOCKOUT_DURATIONS_MINUTES.length - 1,
  );
  const minutes = LOCKOUT_DURATIONS_MINUTES[escalationStep] ?? LOCKOUT_DURATIONS_MINUTES[LOCKOUT_DURATIONS_MINUTES.length - 1]!;
  return { shouldLock: true, lockedUntil: new Date(now.getTime() + minutes * 60_000) };
}

export function isLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > now.getTime();
}

export class AccountLockedError extends Error {
  readonly code = "ACCOUNT_LOCKED";
  constructor(public readonly lockedUntil: Date) {
    super(`Account is locked until ${lockedUntil.toISOString()}`);
    this.name = "AccountLockedError";
  }
}

export function assertNotLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): void {
  if (isLocked(lockedUntil, now)) {
    throw new AccountLockedError(lockedUntil as Date);
  }
}
