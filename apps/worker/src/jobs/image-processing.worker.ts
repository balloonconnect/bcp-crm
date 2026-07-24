import { Worker, type Job } from "bullmq";
import sharp from "sharp";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking, reportProgress } from "../lib/job-tracker";

export interface ImageProcessingJobData {
  jobRecordId: string;
  studioId: string | null;
  sourceKey: string;
  compressedKey: string;
  thumbnailKey: string;
}

const env = getEnv();
const storage = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });

/**
 * Generates the two derived variants every uploaded gallery photo
 * needs: a web-optimized "compressed" copy and a small grid
 * thumbnail — the same two keys `GalleryPhoto.compressedKey`/
 * `thumbnailKey` already expect, produced here in the background
 * rather than inline in the upload request, so a bulk upload of
 * hundreds of photos doesn't hold an HTTP request open for it.
 */
export const imageProcessingWorker = new Worker<ImageProcessingJobData>(
  "image-processing",
  (job: Job<ImageProcessingJobData>) =>
    withJobTracking("image-processing", job, async () => {
      const original = await storage.get(job.data.sourceKey);
      await reportProgress(job, job.data.jobRecordId, 25, "Original downloaded");

      const compressed = await sharp(original).resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      await storage.put(job.data.compressedKey, compressed, "image/jpeg");
      await reportProgress(job, job.data.jobRecordId, 65, "Compressed variant generated");

      const thumbnail = await sharp(original).resize({ width: 400, height: 400, fit: "cover" }).jpeg({ quality: 75 }).toBuffer();
      await storage.put(job.data.thumbnailKey, thumbnail, "image/jpeg");
      await reportProgress(job, job.data.jobRecordId, 100, "Thumbnail generated");

      return { compressedBytes: compressed.length, thumbnailBytes: thumbnail.length };
    }),
  { connection },
);
