import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { recordActivity } from "./activity-log.service";

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    bucket: env.S3_BUCKET,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  return storageClient;
}

export class LeadAttachmentNotFoundError extends Error {
  readonly code = "LEAD_ATTACHMENT_NOT_FOUND";
  constructor() {
    super("Attachment not found");
    this.name = "LeadAttachmentNotFoundError";
  }
}

export async function listLeadAttachments(studioId: string, leadId: string) {
  const attachments = await prisma.leadAttachment.findMany({ where: { studioId, leadId }, orderBy: { createdAt: "desc" } });
  return Promise.all(
    attachments.map(async (attachment: { fileKey: string }) => ({ ...attachment, url: await getStorageClient().getSignedGetUrl(attachment.fileKey) })),
  );
}

export async function uploadLeadAttachment(input: {
  studioId: string;
  leadId: string;
  fileName: string;
  mimeType: string;
  body: Buffer;
  actorId: string;
}) {
  const key = `studios/${input.studioId}/leads/${input.leadId}/attachments/${Date.now()}-${input.fileName}`;
  await getStorageClient().put(key, input.body, input.mimeType);

  const attachment = await prisma.leadAttachment.create({
    data: {
      studioId: input.studioId,
      leadId: input.leadId,
      fileName: input.fileName,
      fileKey: key,
      mimeType: input.mimeType,
      sizeBytes: input.body.byteLength,
      uploadedBy: input.actorId,
    },
  });

  await recordActivity({ studioId: input.studioId, actorId: input.actorId, action: "lead.attachment_uploaded", resourceType: "Lead", resourceId: input.leadId, metadata: { fileName: input.fileName } });

  return { ...attachment, url: await getStorageClient().getSignedGetUrl(key) };
}

export async function deleteLeadAttachment(studioId: string, leadId: string, attachmentId: string, actorId: string) {
  const attachment = await prisma.leadAttachment.findFirst({ where: { id: attachmentId, studioId, leadId } });
  if (!attachment) throw new LeadAttachmentNotFoundError();

  await getStorageClient().delete(attachment.fileKey);
  await prisma.leadAttachment.delete({ where: { id: attachmentId } });

  await recordActivity({ studioId, actorId, action: "lead.attachment_deleted", resourceType: "Lead", resourceId: leadId, metadata: { fileName: attachment.fileName } });
}
