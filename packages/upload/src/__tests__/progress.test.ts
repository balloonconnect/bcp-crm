import { describe, expect, it } from "vitest";
import { computeUploadProgress, summarizeQueue } from "../progress";

describe("computeUploadProgress", () => {
  it("computes percent complete from chunk counts", () => {
    const result = computeUploadProgress({ totalChunks: 4, uploadedChunks: 1, fileSize: 4000, chunkSize: 1000 });
    expect(result.percentComplete).toBe(25);
    expect(result.uploadedBytes).toBe(1000);
    expect(result.remainingBytes).toBe(3000);
  });

  it("returns 0 for a session with no chunks yet", () => {
    expect(computeUploadProgress({ totalChunks: 0, uploadedChunks: 0, fileSize: 0, chunkSize: 1000 }).percentComplete).toBe(0);
  });

  it("never reports more uploaded bytes than the file size", () => {
    const result = computeUploadProgress({ totalChunks: 4, uploadedChunks: 4, fileSize: 3500, chunkSize: 1000 });
    expect(result.uploadedBytes).toBe(3500);
  });
});

describe("summarizeQueue", () => {
  it("aggregates file counts and overall percent across sessions", () => {
    const sessions = [
      { status: "completed", totalChunks: 4, uploadedChunks: 4 },
      { status: "uploading", totalChunks: 4, uploadedChunks: 2 },
      { status: "failed", totalChunks: 4, uploadedChunks: 1 },
    ];
    const summary = summarizeQueue(sessions);
    expect(summary.totalFiles).toBe(3);
    expect(summary.completedFiles).toBe(1);
    expect(summary.failedFiles).toBe(1);
    expect(summary.activeFiles).toBe(1);
    expect(summary.overallPercent).toBe(Math.round((7 / 12) * 100));
  });
});
