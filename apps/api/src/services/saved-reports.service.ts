import PDFDocument from "pdfkit";
import { prisma } from "@bcp/database";
import { buildReportCsv, computeNextSendAt, type ScheduleFrequency } from "@bcp/reports";
import { runReport, type ReportFilters } from "./reports.service";
import { recordActivity } from "./activity-log.service";

export class SavedReportNotFoundError extends Error {
  readonly code = "SAVED_REPORT_NOT_FOUND";
  constructor() {
    super("Saved report not found");
    this.name = "SavedReportNotFoundError";
  }
}

export async function listSavedReports(studioId: string) {
  return prisma.savedReport.findMany({ where: { studioId }, orderBy: { createdAt: "desc" } });
}

export async function saveReport(studioId: string, input: { reportType: string; name: string; filters?: ReportFilters }, actorId: string) {
  const saved = await prisma.savedReport.create({ data: { studioId, reportType: input.reportType as never, name: input.name, filters: input.filters as never, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "saved_report.created", resourceType: "SavedReport", resourceId: saved.id, metadata: { reportType: input.reportType } });
  return saved;
}

export async function deleteSavedReport(studioId: string, savedReportId: string, actorId: string) {
  const existing = await prisma.savedReport.findFirst({ where: { id: savedReportId, studioId } });
  if (!existing) throw new SavedReportNotFoundError();
  await prisma.savedReport.delete({ where: { id: savedReportId } });
  await recordActivity({ studioId, actorId, action: "saved_report.deleted", resourceType: "SavedReport", resourceId: savedReportId });
}

/** "CSV export" — runs the saved report's own snapshotted filters through the exact same `runReport()` every live report view uses, then formats with `@bcp/reports`' shared column-based CSV builder. */
export async function exportSavedReportCsv(studioId: string, savedReportId: string): Promise<string> {
  const saved = await prisma.savedReport.findFirst({ where: { id: savedReportId, studioId } });
  if (!saved) throw new SavedReportNotFoundError();

  const result = await runReport(studioId, saved.reportType, (saved.filters as ReportFilters) ?? {});
  return buildReportCsv(result.columns, result.rows);
}

/** "PDF export" — a plain tabular rendering (title, column headers, rows) via the same `pdfkit` library every other generated-PDF feature in this codebase (invoices, contracts, signing certificates) already uses. */
export async function exportSavedReportPdf(studioId: string, savedReportId: string): Promise<Buffer> {
  const saved = await prisma.savedReport.findFirst({ where: { id: savedReportId, studioId } });
  if (!saved) throw new SavedReportNotFoundError();

  const result = await runReport(studioId, saved.reportType, (saved.filters as ReportFilters) ?? {});

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(saved.name);
    doc.fontSize(9).fillColor("#666").text(`Generated ${new Date().toISOString()}`);
    doc.fillColor("#000").moveDown();

    doc.fontSize(9);
    const header = result.columns.map((c) => c.header).join("   |   ");
    doc.text(header, { underline: true });
    doc.moveDown(0.5);
    for (const row of result.rows.slice(0, 500)) {
      doc.text(result.columns.map((c) => String(row[c.key] ?? "")).join("   |   "));
    }

    doc.end();
  });
}

// ── Scheduled reports ────────────────────────────────────────────────

export async function listScheduledReports(studioId: string) {
  return prisma.scheduledReport.findMany({ where: { studioId }, include: { savedReport: { select: { name: true, reportType: true } } }, orderBy: { createdAt: "desc" } });
}

export async function createSchedule(studioId: string, input: { savedReportId: string; frequency: ScheduleFrequency; recipientEmails: string[] }, actorId: string) {
  const saved = await prisma.savedReport.findFirst({ where: { id: input.savedReportId, studioId } });
  if (!saved) throw new SavedReportNotFoundError();

  const schedule = await prisma.scheduledReport.create({ data: { studioId, savedReportId: input.savedReportId, frequency: input.frequency as never, recipientEmails: input.recipientEmails, nextSendAt: computeNextSendAt(input.frequency), createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "scheduled_report.created", resourceType: "ScheduledReport", resourceId: schedule.id });
  return schedule;
}

export async function setScheduleActive(studioId: string, scheduleId: string, isActive: boolean, actorId: string) {
  const existing = await prisma.scheduledReport.findFirst({ where: { id: scheduleId, studioId } });
  if (!existing) throw new Error("Schedule not found");

  const updated = await prisma.scheduledReport.update({ where: { id: scheduleId }, data: { isActive } });
  await recordActivity({ studioId, actorId, action: isActive ? "scheduled_report.enabled" : "scheduled_report.disabled", resourceType: "ScheduledReport", resourceId: scheduleId });
  return updated;
}

export async function deleteSchedule(studioId: string, scheduleId: string, actorId: string) {
  await prisma.scheduledReport.deleteMany({ where: { id: scheduleId, studioId } });
  await recordActivity({ studioId, actorId, action: "scheduled_report.deleted", resourceType: "ScheduledReport", resourceId: scheduleId });
}
