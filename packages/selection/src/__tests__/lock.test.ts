import { describe, expect, it } from "vitest";
import { resolvePhase, canSubmit, canEditSelection, canReopen } from "../lock";

describe("resolvePhase", () => {
  it("is open with no lock timestamp", () => {
    expect(resolvePhase(null)).toBe("open");
  });

  it("is locked once a lock timestamp is set", () => {
    expect(resolvePhase(new Date())).toBe("locked");
  });
});

describe("canSubmit / canEditSelection / canReopen", () => {
  it("allows submit and editing while open", () => {
    expect(canSubmit(null)).toBe(true);
    expect(canEditSelection(null)).toBe(true);
    expect(canReopen(null)).toBe(false);
  });

  it("blocks submit and editing once locked, allows reopen", () => {
    const lockedAt = new Date();
    expect(canSubmit(lockedAt)).toBe(false);
    expect(canEditSelection(lockedAt)).toBe(false);
    expect(canReopen(lockedAt)).toBe(true);
  });
});
