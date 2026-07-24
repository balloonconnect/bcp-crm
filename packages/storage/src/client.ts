import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export interface MultipartPart {
  partNumber: number;
  etag: string;
}

export class StorageClient {
  private s3: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /** "Storage health" — confirms the bucket exists and is reachable with these credentials, without transferring any object data. The cheapest real signal storage health monitoring needs. */
  async headBucket(): Promise<void> {
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async put(key: string, body: Uint8Array | Buffer, contentType?: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getSignedGetUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Fetches an object's bytes directly (not a signed URL) — used server-side for derivative generation, where the API process itself needs the original's pixels, not a link for a browser to follow. */
  async get(key: string): Promise<Buffer> {
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the SDK's Body is a Node Readable at runtime in this environment, typed as a broader web-stream-compatible union
    for await (const chunk of result.Body as any) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  // ── Multipart upload — chunk/multipart upload for large files ────────

  /** Initiates a multipart upload and returns S3's own upload ID, which every subsequent part/complete/abort call needs. */
  async createMultipartUpload(key: string, contentType?: string): Promise<{ uploadId: string }> {
    const result = await this.s3.send(new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }));
    if (!result.UploadId) throw new Error("S3 did not return an upload ID");
    return { uploadId: result.UploadId };
  }

  /** A presigned PUT URL for one part — the browser uploads the chunk's bytes directly to storage using this URL, never routing the actual bytes through the API server. Part numbers are 1-indexed per S3's own convention, distinct from this codebase's 0-indexed `chunkIndex`. */
  async getUploadPartUrl(key: string, uploadId: string, partNumber: number, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(this.s3, new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: expiresInSeconds });
  }

  /** Finalizes the upload once every part has landed — S3 needs every part's ETag, in part-number order, to assemble the final object. */
  async completeMultipartUpload(key: string, uploadId: string, parts: MultipartPart[]): Promise<void> {
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts.sort((a, b) => a.partNumber - b.partNumber).map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
      }),
    );
  }

  /** Cancels an in-progress multipart upload and releases the partial parts already stored — called when an upload session is abandoned rather than left to expire on its own. */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await this.s3.send(new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }));
  }
}
