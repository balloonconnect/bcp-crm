import { z } from "zod";

const importEntityEnum = z.enum(["leads", "clients", "packages", "services", "payments", "vendors", "equipment", "gallery_metadata"]);
const exportEntityEnum = z.enum(["leads", "clients", "bookings", "events", "payments", "expenses", "galleries", "albums", "audit_logs", "complete_studio_data"]);

export const createImportJobSchema = z.object({ entityType: importEntityEnum, fileKey: z.string().min(1) });
export const setColumnMappingSchema = z.object({ columnMapping: z.record(z.string()), duplicateHandling: z.enum(["skip", "overwrite", "create_new"]).optional() });
export const processImportSchema = z.object({ confirm: z.literal(true) });

export const createExportJobSchema = z.object({ exportType: exportEntityEnum, filters: z.record(z.unknown()).optional() });

export const requestBackupSchema = z.object({ reason: z.string().max(1000).optional() });
export const approveBackupSchema = z.object({ approve: z.boolean(), rejectedReason: z.string().max(1000).optional() });
export const requestRestoreSchema = z.object({ backupId: z.string().uuid(), reason: z.string().max(1000).optional() });
