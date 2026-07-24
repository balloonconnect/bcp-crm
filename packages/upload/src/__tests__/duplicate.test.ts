import { describe, expect, it } from "vitest";
import { checkDuplicate } from "../duplicate";

describe("checkDuplicate", () => {
  it("detects a match against an already-delivered photo", () => {
    const result = checkDuplicate("abc123", [{ checksum: "abc123", photoId: "photo-1" }], []);
    expect(result).toEqual({ isDuplicate: true, matchedPhotoId: "photo-1" });
  });

  it("detects a match against an in-flight session", () => {
    const result = checkDuplicate("abc123", [], [{ checksum: "abc123", sessionId: "session-1" }]);
    expect(result).toEqual({ isDuplicate: true, matchedSessionId: "session-1" });
  });

  it("returns not-a-duplicate when nothing matches", () => {
    expect(checkDuplicate("xyz789", [{ checksum: "abc123", photoId: "photo-1" }], []).isDuplicate).toBe(false);
  });
});
