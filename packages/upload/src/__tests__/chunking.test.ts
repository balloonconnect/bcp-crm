import { describe, expect, it } from "vitest";
import { resolveChunkSize, computeTotalChunks, resolveChunkRange } from "../chunking";

describe("resolveChunkSize", () => {
  it("uses the default chunk size for a normal-sized file", () => {
    expect(resolveChunkSize(50 * 1024 * 1024)).toBe(8 * 1024 * 1024);
  });

  it("grows the chunk size for an extremely large file to stay under the part cap", () => {
    const hugeFile = 200 * 1024 * 1024 * 1024; // 200 GiB
    const chunkSize = resolveChunkSize(hugeFile);
    expect(computeTotalChunks(hugeFile, chunkSize)).toBeLessThanOrEqual(10_000);
  });

  it("never returns less than S3's 5 MiB minimum part size", () => {
    expect(resolveChunkSize(1024)).toBeGreaterThanOrEqual(5 * 1024 * 1024);
  });
});

describe("computeTotalChunks", () => {
  it("computes an exact division", () => {
    expect(computeTotalChunks(16 * 1024 * 1024, 8 * 1024 * 1024)).toBe(2);
  });

  it("rounds up a partial final chunk", () => {
    expect(computeTotalChunks(17 * 1024 * 1024, 8 * 1024 * 1024)).toBe(3);
  });

  it("returns at least 1 chunk for a tiny file", () => {
    expect(computeTotalChunks(100, 8 * 1024 * 1024)).toBe(1);
  });
});

describe("resolveChunkRange", () => {
  it("computes the byte range for a middle chunk", () => {
    expect(resolveChunkRange(1, 1000, 5000)).toEqual({ index: 1, start: 1000, end: 2000 });
  });

  it("clamps the final chunk's end to the file size", () => {
    expect(resolveChunkRange(4, 1000, 4500)).toEqual({ index: 4, start: 4000, end: 4500 });
  });
});
