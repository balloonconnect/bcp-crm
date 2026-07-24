import { describe, expect, it } from "vitest";
import { checkDownloadPermission } from "../download-permissions";

describe("checkDownloadPermission", () => {
  it("allows an original download when enabled and under the limit", () => {
    const result = checkDownloadPermission({ allowOriginalDownload: true, allowCompressedDownload: true, downloadLimitPerGuest: null }, "original", 5);
    expect(result.allowed).toBe(true);
  });

  it("blocks a disabled download type", () => {
    const result = checkDownloadPermission({ allowOriginalDownload: false, allowCompressedDownload: true, downloadLimitPerGuest: null }, "original", 0);
    expect(result).toEqual({ allowed: false, reason: "type_disabled" });
  });

  it("blocks once the per-guest limit is reached", () => {
    const result = checkDownloadPermission({ allowOriginalDownload: true, allowCompressedDownload: true, downloadLimitPerGuest: 3 }, "original", 3);
    expect(result).toEqual({ allowed: false, reason: "limit_reached" });
  });

  it("treats a null limit as unlimited", () => {
    const result = checkDownloadPermission({ allowOriginalDownload: true, allowCompressedDownload: true, downloadLimitPerGuest: null }, "compressed", 1000);
    expect(result.allowed).toBe(true);
  });
});
