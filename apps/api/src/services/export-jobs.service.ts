import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { buildReportCsv } from "@bcp/reports";
import { recordActivity } from "./activity-log.service";

export class ExportJobNotFoundError extends Error {
  readonly code = "EXPORT_JOB_NOT_FOUND";
  constructor() {
    super("Export job not found");
    this.name = "ExportJobNotFoundError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

async function buildExportRows(studioId: string, exportType: string): Promise<{ columns: { key: string; header: string }[]; rows: Record<string, unknown>[] }> {
  switch (exportType) {
    case "leads": {
      const rows = await prisma.lead.findMany({ where: { studioId }, select: { id: true, name: true, phone: true, email: true, status: true, source: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "name", header: "Name" }, { key: "phone", header: "Phone" }, { key: "email", header: "Email" }, { key: "status", header: "Status" }, { key: "source", header: "Source" }, { key: "createdAt", header: "Created" }], rows };
    }
    case "clients": {
      const rows = await prisma.client.findMany({ where: { studioId, deletedAt: null }, select: { id: true, name: true, phone: true, email: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "name", header: "Name" }, { key: "phone", header: "Phone" }, { key: "email", header: "Email" }, { key: "createdAt", header: "Created" }], rows };
    }
    case "bookings": {
      const rows = await prisma.booking.findMany({ where: { studioId }, select: { id: true, status: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "status", header: "Status" }, { key: "createdAt", header: "Created" }], rows };
    }
    case "events": {
      const rows = await prisma.event.findMany({ where: { studioId }, select: { id: true, eventType: true, scheduledAt: true, status: true, venue: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "eventType", header: "Event Type" }, { key: "scheduledAt", header: "Scheduled" }, { key: "status", header: "Status" }, { key: "venue", header: "Venue" }], rows };
    }
    case "payments": {
      const rows = await prisma.clientPayment.findMany({ where: { invoice: { studioId } }, select: { id: true, amount: true, method: true, paidAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "amount", header: "Amount (paise)" }, { key: "method", header: "Method" }, { key: "paidAt", header: "Paid At" }], rows };
    }
    case "expenses": {
      const rows = await prisma.expense.findMany({ where: { studioId }, select: { id: true, category: true, amount: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "category", header: "Category" }, { key: "amount", header: "Amount (paise)" }, { key: "createdAt", header: "Date" }], rows };
    }
    case "galleries": {
      const rows = await prisma.gallery.findMany({ where: { studioId }, select: { id: true, title: true, photoCount: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "title", header: "Title" }, { key: "photoCount", header: "Photo Count" }, { key: "createdAt", header: "Created" }], rows };
    }
    case "albums": {
      const rows = await prisma.album.findMany({ where: { studioId }, select: { id: true, status: true, productionStage: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "status", header: "Status" }, { key: "productionStage", header: "Production Stage" }, { key: "createdAt", header: "Created" }], rows };
    }
    case "audit_logs": {
      const rows = await prisma.auditLog.findMany({ where: { studioId }, orderBy: { createdAt: "desc" }, take: 5000, select: { id: true, action: true, actorId: true, resourceType: true, resourceId: true, createdAt: true } });
      return { columns: [{ key: "id", header: "ID" }, { key: "action", header: "Action" }, { key: "actorId", header: "Actor" }, { key: "resourceType", header: "Resource Type" }, { key: "resourceId", header: "Resource ID" }, { key: "createdAt", header: "Date" }], rows };
    }
    default:
      throw new Error(`Unknown export type: ${exportType}`);
  }
}

const EXPORTABLE_TYPES = ["leads", "clients", "bookings", "events", "payments", "expenses", "galleries", "albums", "audit_logs"];

export async function listExportJobs(studioId: string) {
  return prisma.exportJob.findMany({ where: { studioId }, orderBy: { createdAt: "desc" } });
}

/**
 * "Complete studio data" runs every other export type in sequence and
 * bundles the resulting CSVs together (newline-separated with a
 * header marking where each section starts) into one file — the same
 * pipeline as any other export, just covering everything at once
 * rather than special-cased.
 */
export async function createExportJob(studioId: string, exportType: string, actorId: string) {
  const job = await prisma.exportJob.create({ data: { studioId, exportType: exportType as never, status: "processing", createdBy: actorId } });

  try {
    let content: string;
    if (exportType === "complete_studio_data") {
      const sections = await Promise.all(EXPORTABLE_TYPES.map(async (type) => ({ type, result: await buildExportRows(studioId, type) })));
      content = sections.map((s) => `=== ${s.type.toUpperCase()} ===\n${buildReportCsv(s.result.columns, s.result.rows)}`).join("\n\n");
    } else {
      const result = await buildExportRows(studioId, exportType);
      content = buildReportCsv(result.columns, result.rows);
    }

    const fileKey = `exports/${studioId}/${job.id}.csv`;
    await getStorageClient().put(fileKey, Buffer.from(content, "utf-8"), "text/csv");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days — an export link doesn't stay valid forever
    const updated = await prisma.exportJob.update({ where: { id: job.id }, data: { status: "completed", fileKey, completedAt: new Date(), expiresAt } });

    await recordActivity({ studioId, actorId, action: "export_job.completed", resourceType: "ExportJob", resourceId: job.id, metadata: { exportType } });
    return updated;
  } catch (error) {
    await prisma.exportJob.update({ where: { id: job.id }, data: { status: "failed" } });
    throw error;
  }
}

export async function getExportDownloadUrl(studioId: string, jobId: string) {
  const job = await prisma.exportJob.findFirst({ where: { id: jobId, studioId } });
  if (!job?.fileKey) throw new ExportJobNotFoundError();
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) throw new Error("This export link has expired. Generate a new export.");
  return getStorageClient().getSignedGetUrl(job.fileKey);
}
