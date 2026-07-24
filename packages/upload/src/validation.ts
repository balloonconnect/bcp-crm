import { z } from "zod";

export const createUploadSessionSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
  checksum: z.string().length(64), // SHA-256 hex
  preferWifi: z.boolean().optional(),
});

export const uploadChunkCompleteSchema = z.object({ chunkIndex: z.number().int().nonnegative(), etag: z.string().min(1) });

/** Image types this pipeline actually knows how to derive thumbnail/preview/web/blur variants from — a studio uploading a RAW file or a PDF through the same flow would need a different pipeline entirely, so this is checked before a session is even created, not discovered after upload. */
export const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export const requestUploadSchema = createUploadSessionSchema.refine((data) => (SUPPORTED_MIME_TYPES as readonly string[]).includes(data.mimeType), { message: "Unsupported file type", path: ["mimeType"] });
