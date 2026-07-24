import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { parseCsv, rowsToRecords, getImportFields, applyColumnMapping, suggestColumnMapping, validateRow, resolveDuplicateAction } from "@bcp/data-portability";
import { recordActivity } from "./activity-log.service";

export class ImportJobNotFoundError extends Error {
  readonly code = "IMPORT_JOB_NOT_FOUND";
  constructor() {
    super("Import job not found");
    this.name = "ImportJobNotFoundError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function listImportJobs(studioId: string) {
  return prisma.importJob.findMany({ where: { studioId }, orderBy: { createdAt: "desc" } });
}

export async function getImportJob(studioId: string, jobId: string) {
  const job = await prisma.importJob.findFirst({ where: { id: jobId, studioId }, include: { errors: true } });
  if (!job) throw new ImportJobNotFoundError();
  return job;
}

export async function createImportJob(studioId: string, entityType: string, fileKey: string, actorId: string) {
  const job = await prisma.importJob.create({ data: { studioId, entityType: entityType as never, fileKey, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "import_job.created", resourceType: "ImportJob", resourceId: job.id, metadata: { entityType } });
  return job;
}

/** Returns the CSV's own headers plus an auto-suggested mapping — the first half of "Column mapping," so a studio's UI can pre-fill the obvious matches and only ask about the rest. */
export async function getSuggestedMapping(studioId: string, jobId: string) {
  const job = await getImportJob(studioId, jobId);
  const csvBuffer = await getStorageClient().get(job.fileKey);
  const { headers } = parseCsv(csvBuffer.toString("utf-8"));
  const fields = getImportFields(job.entityType);
  return { headers, fields, suggestedMapping: suggestColumnMapping(headers, fields) };
}

export async function setColumnMapping(studioId: string, jobId: string, columnMapping: Record<string, string>, duplicateHandling: string | undefined, actorId: string) {
  await getImportJob(studioId, jobId);
  const job = await prisma.importJob.update({ where: { id: jobId }, data: { columnMapping, duplicateHandling: duplicateHandling as never, status: "mapping" } });
  await recordActivity({ studioId, actorId, action: "import_job.mapping_set", resourceType: "ImportJob", resourceId: jobId });
  return job;
}

/** "Preview" — runs every row through mapping and validation without writing anything, so a studio can see exactly what will succeed and what won't before committing. */
export async function previewImport(studioId: string, jobId: string) {
  const job = await getImportJob(studioId, jobId);
  if (!job.columnMapping) throw new Error("Set a column mapping before previewing.");

  const csvBuffer = await getStorageClient().get(job.fileKey);
  const { headers, rows } = parseCsv(csvBuffer.toString("utf-8"));
  const records = rowsToRecords(headers, rows);
  const fields = getImportFields(job.entityType);
  const mapping = job.columnMapping as Record<string, string>;

  const preview = records.slice(0, 20).map((record, i) => {
    const mapped = applyColumnMapping(record, mapping);
    const validation = validateRow(mapped, fields);
    return { rowNumber: i + 1, mapped, valid: validation.valid, errors: validation.errors };
  });

  await prisma.importJob.update({ where: { id: jobId }, data: { status: "previewing", totalRows: records.length } });
  return { totalRows: records.length, preview };
}

/**
 * The actual write pass — every row is mapped, validated, and checked
 * for a duplicate before being resolved to insert/update/skip
 * (`resolveDuplicateAction()`). A failing row never aborts the whole
 * job; it's recorded as an `ImportJobError` and the job moves on,
 * finishing as `completed` (every row succeeded), `partially_completed`
 * (some rows failed), or `failed` (nothing succeeded at all) —
 * "Error report" is this codebase's actual name for what a studio
 * reviews afterward, not a side effect of a job that just stopped.
 */
export async function processImport(studioId: string, jobId: string, actorId: string) {
  const job = await getImportJob(studioId, jobId);
  if (!job.columnMapping) throw new Error("Set a column mapping before processing.");

  await prisma.importJob.update({ where: { id: jobId }, data: { status: "processing" } });

  const csvBuffer = await getStorageClient().get(job.fileKey);
  const { headers, rows } = parseCsv(csvBuffer.toString("utf-8"));
  const records = rowsToRecords(headers, rows);
  const fields = getImportFields(job.entityType);
  const mapping = job.columnMapping as Record<string, string>;

  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const errors: { rowNumber: number; rawData: Record<string, string>; errorMessage: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    const mapped = applyColumnMapping(record, mapping);
    const validation = validateRow(mapped, fields);

    if (!validation.valid) {
      errorCount += 1;
      errors.push({ rowNumber: i + 1, rawData: record, errorMessage: validation.errors.join("; ") });
      continue;
    }

    try {
      const outcome = await writeImportedRow(studioId, job.entityType, mapped, job.duplicateHandling);
      if (outcome === "skip") duplicateCount += 1;
      else successCount += 1;
    } catch (error) {
      errorCount += 1;
      errors.push({ rowNumber: i + 1, rawData: record, errorMessage: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  if (errors.length > 0) await prisma.importJobError.createMany({ data: errors.map((e) => ({ importJobId: jobId, rowNumber: e.rowNumber, rawData: e.rawData, errorMessage: e.errorMessage })) });

  const status = errorCount === 0 ? "completed" : successCount === 0 ? "failed" : "partially_completed";
  const updated = await prisma.importJob.update({ where: { id: jobId }, data: { status, processedRows: records.length, successCount, errorCount, duplicateCount, completedAt: new Date() } });

  await recordActivity({ studioId, actorId, action: "import_job.processed", resourceType: "ImportJob", resourceId: jobId, metadata: { successCount, errorCount, duplicateCount } });
  return updated;
}

async function writeImportedRow(studioId: string, entityType: string, row: Record<string, string>, duplicateHandling: string): Promise<"insert" | "update" | "skip"> {
  if (entityType === "leads") {
    const existing = row.phone ? await prisma.lead.findFirst({ where: { studioId, phone: row.phone } }) : null;
    const action = resolveDuplicateAction(Boolean(existing), duplicateHandling as never);
    if (action === "skip") return "skip";
    const data = { studioId, name: row.name, phone: row.phone, email: row.email || undefined, eventType: row.eventType || undefined };
    if (action === "update" && existing) await prisma.lead.update({ where: { id: existing.id }, data });
    else await prisma.lead.create({ data });
    return action;
  }
  if (entityType === "clients") {
    const existing = row.phone ? await prisma.client.findFirst({ where: { studioId, phone: row.phone, deletedAt: null } }) : null;
    const action = resolveDuplicateAction(Boolean(existing), duplicateHandling as never);
    if (action === "skip") return "skip";
    const data = { studioId, name: row.name, phone: row.phone, email: row.email || undefined };
    if (action === "update" && existing) await prisma.client.update({ where: { id: existing.id }, data });
    else await prisma.client.create({ data });
    return action;
  }
  if (entityType === "packages") {
    await prisma.package.create({ data: { studioId, name: row.name, eventType: row.eventType, customerFacingTotal: Math.round(Number(row.price) * 100) } });
    return "insert";
  }
  if (entityType === "services") {
    await prisma.service.create({ data: { studioId, name: row.name, internalPrice: Math.round(Number(row.price) * 100) } });
    return "insert";
  }
  if (entityType === "vendors") {
    const existing = row.name ? await prisma.vendor.findFirst({ where: { studioId, name: row.name } }) : null;
    const action = resolveDuplicateAction(Boolean(existing), duplicateHandling as never);
    if (action === "skip") return "skip";
    const data = { studioId, name: row.name, contactPersonName: row.phone || undefined };
    if (action === "update" && existing) await prisma.vendor.update({ where: { id: existing.id }, data });
    else await prisma.vendor.create({ data });
    return action;
  }
  if (entityType === "equipment") {
    await prisma.equipment.create({ data: { studioId, name: row.name, category: row.category || undefined } });
    return "insert";
  }
  if (entityType === "payments") {
    const invoice = await prisma.invoice.findFirst({ where: { studioId, invoiceNumber: row.invoiceNumber } });
    if (!invoice) throw new Error(`No invoice found matching "${row.invoiceNumber}"`);
    await prisma.clientPayment.create({ data: { invoiceId: invoice.id, amount: Math.round(Number(row.amount) * 100), method: row.method as never, paidAt: row.paidAt ? new Date(row.paidAt) : new Date() } });
    return "insert";
  }
  if (entityType === "gallery_metadata") {
    const gallery = await prisma.gallery.findFirst({ where: { studioId, title: row.galleryTitle } });
    if (!gallery) throw new Error(`No gallery found matching "${row.galleryTitle}"`);
    const photo = await prisma.galleryPhoto.findFirst({ where: { galleryId: gallery.id, fileKey: { endsWith: row.photoFileName } } });
    if (!photo) throw new Error(`No photo found matching "${row.photoFileName}" in gallery "${row.galleryTitle}"`);
    await prisma.galleryPhoto.update({ where: { id: photo.id }, data: { category: row.category || undefined } });
    return "update";
  }
  throw new Error(`Import not implemented for entity type: ${entityType}`);
}

/** "Retry" — re-runs only the rows that previously failed, through the exact same mapping/validation/write path; a row that succeeds this time is removed from the error list rather than double-counted. */
export async function retryFailedRows(studioId: string, jobId: string, actorId: string) {
  const job = await getImportJob(studioId, jobId);
  const mapping = job.columnMapping as Record<string, string>;
  const fields = getImportFields(job.entityType);

  let retriedSuccessCount = 0;
  const stillFailing: typeof job.errors = [];

  for (const errorRow of job.errors) {
    const raw = errorRow.rawData as Record<string, string>;
    const mapped = applyColumnMapping(raw, mapping);
    const validation = validateRow(mapped, fields);

    if (!validation.valid) {
      stillFailing.push(errorRow);
      continue;
    }

    try {
      await writeImportedRow(studioId, job.entityType, mapped, job.duplicateHandling);
      retriedSuccessCount += 1;
      await prisma.importJobError.update({ where: { id: errorRow.id }, data: { retried: true } });
    } catch {
      stillFailing.push(errorRow);
    }
  }

  await prisma.importJob.update({ where: { id: jobId }, data: { successCount: { increment: retriedSuccessCount }, errorCount: { decrement: retriedSuccessCount }, status: stillFailing.length === 0 ? "completed" : "partially_completed" } });
  await recordActivity({ studioId, actorId, action: "import_job.retried", resourceType: "ImportJob", resourceId: jobId, metadata: { retriedSuccessCount, stillFailingCount: stillFailing.length } });

  return getImportJob(studioId, jobId);
}
