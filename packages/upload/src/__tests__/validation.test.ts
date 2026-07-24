import { describe, expect, it } from "vitest";
import { createUploadSessionSchema, requestUploadSchema, uploadChunkCompleteSchema } from "../validation";

describe("createUploadSessionSchema", () => {
  it("accepts a valid session request", () => {
    const result = createUploadSessionSchema.safeParse({ fileName: "photo.jpg", fileSize: 5000000, mimeType: "image/jpeg", checksum: "a".repeat(64) });
    expect(result.success).toBe(true);
  });

  it("rejects a checksum that isn't a 64-char hex string", () => {
    expect(createUploadSessionSchema.safeParse({ fileName: "photo.jpg", fileSize: 100, mimeType: "image/jpeg", checksum: "tooshort" }).success).toBe(false);
  });
});

describe("requestUploadSchema", () => {
  it("accepts a supported image type", () => {
    const result = requestUploadSchema.safeParse({ fileName: "photo.heic", fileSize: 100, mimeType: "image/heic", checksum: "a".repeat(64) });
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported file type", () => {
    const result = requestUploadSchema.safeParse({ fileName: "doc.pdf", fileSize: 100, mimeType: "application/pdf", checksum: "a".repeat(64) });
    expect(result.success).toBe(false);
  });
});

describe("uploadChunkCompleteSchema", () => {
  it("accepts a completed chunk with an ETag", () => {
    expect(uploadChunkCompleteSchema.safeParse({ chunkIndex: 0, etag: "\"abc123\"" }).success).toBe(true);
  });
});
