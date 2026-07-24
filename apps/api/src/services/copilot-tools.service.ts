import { prisma } from "@bcp/database";
import type { SourceReference } from "@bcp/copilot";

export interface ToolResult {
  data: unknown;
  sourceReferences: SourceReference[];
}

/**
 * Every tool implementation here takes `studioId` as its *first*
 * parameter, supplied by `copilot.service.ts`'s orchestration loop
 * from the authenticated request — never from the tool's own `input`
 * (which comes from the model). This file is the other load-bearing
 * half of "never allow cross-tenant AI context": even if a tool's
 * JSON schema were somehow tricked into asking for a studioId, these
 * functions don't have a parameter slot for one from that source.
 */

export async function listEvents(studioId: string, input: { fromDate: string; toDate: string }): Promise<ToolResult> {
  const events = await prisma.event.findMany({
    where: { studioId, scheduledAt: { gte: new Date(input.fromDate), lte: new Date(input.toDate) } },
    select: { id: true, eventType: true, scheduledAt: true, status: true, venue: true },
    orderBy: { scheduledAt: "asc" },
  });
  return { data: events, sourceReferences: events.map((e: { id: string }) => ({ type: "Event", id: e.id })) };
}

export async function listOverdueInvoices(studioId: string): Promise<ToolResult> {
  const invoices = await prisma.invoice.findMany({
    where: { studioId, status: { in: ["unpaid", "partially_paid", "overdue"] }, dueDate: { lt: new Date() } },
    select: { id: true, invoiceNumber: true, totalAmount: true, amountPaid: true, dueDate: true, clientId: true },
    orderBy: { dueDate: "asc" },
  });
  return { data: invoices, sourceReferences: invoices.map((i: { id: string }) => ({ type: "Invoice", id: i.id })) };
}

/** A "pending" album is one whose selection hasn't been submitted (`lockedAt` unset) — matches Prompt 31's own definition of an open selection. */
export async function listPendingAlbumSelections(studioId: string): Promise<ToolResult> {
  const albums = await prisma.album.findMany({
    where: { studioId, lockedAt: null, status: { in: ["pending_selection", "selection_in_progress"] } },
    select: { id: true, status: true, deadline: true, event: { select: { id: true, eventType: true, client: { select: { id: true, name: true } } } } },
  });
  return {
    data: albums.map((a: { id: string; status: string; deadline: Date | null; event: { eventType: string; client: { id: string; name: string } } }) => ({ albumId: a.id, status: a.status, deadline: a.deadline, clientId: a.event.client.id, clientName: a.event.client.name, eventType: a.event.eventType })),
    sourceReferences: albums.map((a: { id: string }) => ({ type: "Album", id: a.id })),
  };
}

export async function getClientSummary(studioId: string, input: { clientId: string }): Promise<ToolResult> {
  const client = await prisma.client.findFirstOrThrow({ where: { id: input.clientId, studioId } });
  const [bookings, events, invoices] = await Promise.all([
    prisma.booking.findMany({ where: { studioId, clientId: input.clientId }, select: { id: true, status: true } }),
    prisma.event.findMany({ where: { studioId, clientId: input.clientId }, select: { id: true, eventType: true, scheduledAt: true, status: true } }),
    prisma.invoice.findMany({ where: { studioId, clientId: input.clientId }, select: { id: true, totalAmount: true, amountPaid: true, status: true } }),
  ]);

  const outstandingPaise = invoices.reduce((sum: number, i: { totalAmount: number; amountPaid: number }) => sum + (i.totalAmount - i.amountPaid), 0);

  return {
    data: { client: { id: client.id, name: client.name, email: client.email, phone: client.phone }, bookingCount: bookings.length, events, outstandingPaise, invoiceCount: invoices.length },
    sourceReferences: [{ type: "Client", id: client.id }, ...events.map((e: { id: string }) => ({ type: "Event", id: e.id })), ...invoices.map((i: { id: string }) => ({ type: "Invoice", id: i.id }))],
  };
}

/** "Which editor is overloaded?" — a workload proxy from open (non-completed, non-cancelled) task assignments per team member, since there's no dedicated "editor" role field to query directly. */
export async function getEditorWorkload(studioId: string): Promise<ToolResult> {
  const tasks = await prisma.task.findMany({
    where: { studioId, status: { in: ["pending", "in_progress", "blocked"] }, assigneeId: { not: null } },
    select: { id: true, assigneeId: true, assignee: { select: { name: true } } },
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const task of tasks as { assigneeId: string | null; assignee: { name: string } | null }[]) {
    if (!task.assigneeId) continue;
    const existing = counts.get(task.assigneeId) ?? { name: task.assignee?.name ?? "Unknown", count: 0 };
    existing.count += 1;
    counts.set(task.assigneeId, existing);
  }

  const workload = [...counts.entries()].map(([assigneeId, v]) => ({ assigneeId, name: v.name, openTaskCount: v.count })).sort((a, b) => b.openTaskCount - a.openTaskCount);
  return { data: workload, sourceReferences: tasks.map((t: { id: string }) => ({ type: "Task", id: t.id })) };
}

/** A simplified heuristic, stated plainly rather than dressed up as a sophisticated model: the sum of invoices already issued for events scheduled in the target month. A true forecast (weighting unconfirmed leads, seasonal trends) is future work this doesn't claim to be. */
export async function forecastRevenue(studioId: string, input: { month?: string }): Promise<ToolResult> {
  const now = new Date();
  const [year, monthNum] = (input.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-").map(Number);
  const from = new Date(year!, monthNum! - 1, 1);
  const to = new Date(year!, monthNum!, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({ where: { studioId, event: { scheduledAt: { gte: from, lte: to } } }, select: { id: true, totalAmount: true, amountPaid: true, status: true } });
  const forecastPaise = invoices.reduce((sum: number, i: { totalAmount: number }) => sum + i.totalAmount, 0);
  const collectedPaise = invoices.reduce((sum: number, i: { amountPaid: number }) => sum + i.amountPaid, 0);

  return { data: { month: `${year}-${String(monthNum).padStart(2, "0")}`, forecastPaise, collectedPaise, invoiceCount: invoices.length, methodology: "sum of invoices issued for events in this month — not weighted by probability" }, sourceReferences: invoices.map((i: { id: string }) => ({ type: "Invoice", id: i.id })) };
}

/** "Low-profit events" — revenue (issued invoice totals) minus direct expenses, as a percentage of revenue, below the given threshold (default 20%). */
export async function listLowProfitEvents(studioId: string, input: { thresholdPercent?: number }): Promise<ToolResult> {
  const threshold = input.thresholdPercent ?? 20;
  const events = await prisma.event.findMany({ where: { studioId, status: "completed" }, select: { id: true, eventType: true, scheduledAt: true, invoices: { select: { totalAmount: true } }, expenses: { select: { amount: true } } } });

  const lowProfit = (events as { id: string; eventType: string; scheduledAt: Date; invoices: { totalAmount: number }[]; expenses: { amount: number }[] }[])
    .map((e) => {
      const revenue = e.invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const expenses = e.expenses.reduce((sum, x) => sum + x.amount, 0);
      const profitPercent = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
      return { eventId: e.id, eventType: e.eventType, scheduledAt: e.scheduledAt, revenuePaise: revenue, expensesPaise: expenses, profitPercent };
    })
    .filter((e) => e.revenuePaise > 0 && e.profitPercent < threshold);

  return { data: lowProfit, sourceReferences: lowProfit.map((e) => ({ type: "Event", id: e.eventId })) };
}

export async function suggestPackage(studioId: string, input: { leadId: string }): Promise<ToolResult> {
  const lead = await prisma.lead.findFirstOrThrow({ where: { id: input.leadId, studioId } });
  const packages = await prisma.package.findMany({ where: { studioId, ...(lead.eventType ? { eventType: lead.eventType } : {}) }, select: { id: true, name: true, customerFacingTotal: true, description: true } });

  return { data: { lead: { id: lead.id, eventType: lead.eventType, budget: lead.budget }, candidatePackages: packages }, sourceReferences: [{ type: "Lead", id: lead.id }, ...packages.map((p: { id: string }) => ({ type: "Package", id: p.id }))] };
}
