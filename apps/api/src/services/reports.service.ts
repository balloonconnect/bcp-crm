import { prisma } from "@bcp/database";

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  userId?: string;
}

export interface ReportResult {
  columns: { key: string; header: string }[];
  rows: Record<string, unknown>[];
}

function dateRange(filters: ReportFilters) {
  return { gte: filters.fromDate ? new Date(filters.fromDate) : undefined, lte: filters.toDate ? new Date(filters.toDate) : undefined };
}

/**
 * One function per report type, each returning the same
 * `{ columns, rows }` shape so a single CSV/PDF export path
 * (`@bcp/reports`' `buildReportCsv()`) and a single frontend table/
 * chart renderer handle every report — "Data-table alternatives" and
 * "Responsive charts" both read this one normalized shape rather than
 * 22 differently-structured payloads.
 */
export async function runReport(studioId: string, reportType: string, filters: ReportFilters): Promise<ReportResult> {
  switch (reportType) {
    case "leads": {
      const leads = await prisma.lead.findMany({ where: { studioId, createdAt: dateRange(filters), ...(filters.branchId ? { branchId: filters.branchId } : {}) }, select: { id: true, name: true, eventType: true, status: true, source: true, createdAt: true } });
      return { columns: [{ key: "name", header: "Name" }, { key: "eventType", header: "Event Type" }, { key: "status", header: "Status" }, { key: "source", header: "Source" }, { key: "createdAt", header: "Created" }], rows: leads };
    }
    case "sources": {
      const leads = await prisma.lead.groupBy({ by: ["source"], where: { studioId, createdAt: dateRange(filters) }, _count: { _all: true } });
      return { columns: [{ key: "source", header: "Source" }, { key: "count", header: "Lead Count" }], rows: leads.map((l: { source: string; _count: { _all: number } }) => ({ source: l.source, count: l._count._all })) };
    }
    case "conversion": {
      const [totalLeads, convertedLeads] = await Promise.all([
        prisma.lead.count({ where: { studioId, createdAt: dateRange(filters) } }),
        prisma.lead.count({ where: { studioId, createdAt: dateRange(filters), status: "converted" } }),
      ]);
      const rate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      return { columns: [{ key: "metric", header: "Metric" }, { key: "value", header: "Value" }], rows: [{ metric: "Total leads", value: totalLeads }, { metric: "Converted", value: convertedLeads }, { metric: "Conversion rate", value: `${rate.toFixed(1)}%` }] };
    }
    case "quotations": {
      const quotations = await prisma.quotation.findMany({ where: { studioId, createdAt: dateRange(filters), ...(filters.branchId ? { branchId: filters.branchId } : {}) }, select: { id: true, quotationNumber: true, status: true, totalAmount: true, createdAt: true } });
      return { columns: [{ key: "quotationNumber", header: "Quotation #" }, { key: "status", header: "Status" }, { key: "totalAmount", header: "Amount (paise)" }, { key: "createdAt", header: "Created" }], rows: quotations };
    }
    case "bookings": {
      const bookings = await prisma.booking.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, status: true, createdAt: true } });
      return { columns: [{ key: "id", header: "Booking ID" }, { key: "status", header: "Status" }, { key: "createdAt", header: "Created" }], rows: bookings };
    }
    case "revenue": {
      const invoices = await prisma.invoice.findMany({ where: { studioId, createdAt: dateRange(filters), ...(filters.branchId ? { branchId: filters.branchId } : {}) }, select: { invoiceNumber: true, totalAmount: true, amountPaid: true, createdAt: true } });
      return { columns: [{ key: "invoiceNumber", header: "Invoice #" }, { key: "totalAmount", header: "Total (paise)" }, { key: "amountPaid", header: "Paid (paise)" }, { key: "createdAt", header: "Created" }], rows: invoices };
    }
    case "payments": {
      const payments = await prisma.clientPayment.findMany({ where: { invoice: { studioId }, paidAt: dateRange(filters) }, select: { id: true, amount: true, method: true, paidAt: true } });
      return { columns: [{ key: "id", header: "Payment ID" }, { key: "amount", header: "Amount (paise)" }, { key: "method", header: "Method" }, { key: "paidAt", header: "Paid At" }], rows: payments };
    }
    case "outstanding_amounts": {
      const invoices = await prisma.invoice.findMany({ where: { studioId, status: { in: ["unpaid", "partially_paid", "overdue"] } }, select: { invoiceNumber: true, totalAmount: true, amountPaid: true, dueDate: true, clientId: true } });
      return { columns: [{ key: "invoiceNumber", header: "Invoice #" }, { key: "totalAmount", header: "Total (paise)" }, { key: "amountPaid", header: "Paid (paise)" }, { key: "dueDate", header: "Due Date" }], rows: invoices.map((i: { invoiceNumber: string; totalAmount: number; amountPaid: number; dueDate: Date | null }) => ({ ...i, outstanding: i.totalAmount - i.amountPaid })) };
    }
    case "expenses": {
      const expenses = await prisma.expense.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, category: true, amount: true, createdAt: true } });
      return { columns: [{ key: "category", header: "Category" }, { key: "amount", header: "Amount (paise)" }, { key: "createdAt", header: "Date" }], rows: expenses };
    }
    case "profit": {
      const events = await prisma.event.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, eventType: true, invoices: { select: { totalAmount: true } }, expenses: { select: { amount: true } } } });
      const rows = (events as { id: string; eventType: string; invoices: { totalAmount: number }[]; expenses: { amount: number }[] }[]).map((e) => {
        const revenue = e.invoices.reduce((s, i) => s + i.totalAmount, 0);
        const cost = e.expenses.reduce((s, x) => s + x.amount, 0);
        return { eventType: e.eventType, revenue, cost, profit: revenue - cost };
      });
      return { columns: [{ key: "eventType", header: "Event Type" }, { key: "revenue", header: "Revenue (paise)" }, { key: "cost", header: "Cost (paise)" }, { key: "profit", header: "Profit (paise)" }], rows };
    }
    case "packages": {
      const packages = await prisma.package.findMany({ where: { studioId }, select: { name: true, eventType: true, customerFacingTotal: true } });
      return { columns: [{ key: "name", header: "Package" }, { key: "eventType", header: "Event Type" }, { key: "customerFacingTotal", header: "Price (paise)" }], rows: packages };
    }
    case "event_types": {
      const events = await prisma.event.groupBy({ by: ["eventType"], where: { studioId, createdAt: dateRange(filters) }, _count: { _all: true } });
      return { columns: [{ key: "eventType", header: "Event Type" }, { key: "count", header: "Count" }], rows: events.map((e: { eventType: string; _count: { _all: number } }) => ({ eventType: e.eventType, count: e._count._all })) };
    }
    case "branches": {
      const branches = await prisma.studioBranch.findMany({ where: { studioId }, select: { name: true, city: true } });
      return { columns: [{ key: "name", header: "Branch" }, { key: "city", header: "City" }], rows: branches };
    }
    case "team_performance": {
      const tasks = await prisma.task.groupBy({ by: ["assigneeId"], where: { studioId, createdAt: dateRange(filters), status: "completed", assigneeId: { not: null } }, _count: { _all: true } });
      const users = await prisma.studioUser.findMany({ where: { studioId, id: { in: tasks.map((t: { assigneeId: string | null }) => t.assigneeId!).filter(Boolean) } }, select: { id: true, name: true } });
      const nameById = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));
      return { columns: [{ key: "name", header: "Team Member" }, { key: "completedTasks", header: "Completed Tasks" }], rows: tasks.map((t: { assigneeId: string | null; _count: { _all: number } }) => ({ name: nameById.get(t.assigneeId!) ?? "Unknown", completedTasks: t._count._all })) };
    }
    case "freelancer_cost": {
      const payments = await prisma.freelancerPayment.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, amount: true, status: true, freelancerId: true } });
      return { columns: [{ key: "id", header: "Payment ID" }, { key: "amount", header: "Amount (paise)" }, { key: "status", header: "Status" }], rows: payments };
    }
    case "album_production": {
      const albums = await prisma.album.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, status: true, productionStage: true } });
      return { columns: [{ key: "id", header: "Album ID" }, { key: "status", header: "Status" }, { key: "productionStage", header: "Production Stage" }], rows: albums };
    }
    case "gallery_activity": {
      const galleries = await prisma.gallery.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { id: true, title: true, photoCount: true } });
      return { columns: [{ key: "title", header: "Gallery" }, { key: "photoCount", header: "Photo Count" }], rows: galleries };
    }
    case "client_satisfaction": {
      const feedback = await prisma.clientFeedback.findMany({ where: { studioId, createdAt: dateRange(filters) }, select: { rating: true, comment: true, createdAt: true } });
      const avg = feedback.length > 0 ? feedback.reduce((s: number, f: { rating: number }) => s + f.rating, 0) / feedback.length : 0;
      return { columns: [{ key: "rating", header: "Rating" }, { key: "comment", header: "Comment" }, { key: "createdAt", header: "Date" }], rows: [{ rating: `Average: ${avg.toFixed(1)}`, comment: `${feedback.length} responses`, createdAt: "" }, ...feedback] };
    }
    case "referrals": {
      const referrals = await prisma.client.findMany({ where: { studioId, referredById: { not: null }, createdAt: dateRange(filters) }, select: { name: true, referredById: true, createdAt: true } });
      return { columns: [{ key: "name", header: "Referred Client" }, { key: "referredById", header: "Referred By (ID)" }, { key: "createdAt", header: "Date" }], rows: referrals };
    }
    case "storage": {
      const uploads = await prisma.uploadSession.aggregate({ where: { studioId, status: "completed" }, _sum: { fileSize: true }, _count: { _all: true } });
      return { columns: [{ key: "metric", header: "Metric" }, { key: "value", header: "Value" }], rows: [{ metric: "Total files", value: uploads._count._all }, { metric: "Total storage (bytes)", value: uploads._sum.fileSize ?? 0 }] };
    }
    case "ai_usage": {
      const [photoAnalyses, faceSearches, marketingRequests, copilotQueries] = await Promise.all([
        prisma.photoAnalysis.count({ where: { studioId } }),
        prisma.faceSearchSession.count({ where: { studioId } }),
        prisma.marketingContentRequest.count({ where: { studioId } }),
        prisma.copilotAuditLogEntry.count({ where: { studioId, action: "query_received" } }),
      ]);
      return { columns: [{ key: "feature", header: "Feature" }, { key: "usageCount", header: "Usage Count" }], rows: [{ feature: "Photo analyses", usageCount: photoAnalyses }, { feature: "Face searches", usageCount: faceSearches }, { feature: "Marketing content generated", usageCount: marketingRequests }, { feature: "Copilot queries", usageCount: copilotQueries }] };
    }
    case "whatsapp_usage": {
      const messages = await prisma.whatsAppMessage.groupBy({ by: ["status"], where: { studioId, createdAt: dateRange(filters) }, _count: { _all: true } });
      return { columns: [{ key: "status", header: "Status" }, { key: "count", header: "Count" }], rows: messages.map((m: { status: string; _count: { _all: number } }) => ({ status: m.status, count: m._count._all })) };
    }
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}
