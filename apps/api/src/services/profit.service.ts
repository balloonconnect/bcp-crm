import { prisma } from "@bcp/database";
import { computeEventGrossProfit, computeStudioProfitSummary, computeReceivables, computePayables } from "@bcp/finance";

/**
 * Event revenue/cost/profit — revenue is what's been invoiced for this
 * event (recognized, not necessarily collected yet — that gap is what
 * receivables tracks separately), cost is expenses explicitly tagged to
 * this event. This deliberately doesn't try to allocate a share of a
 * parent Booking's `internalCost` per-event when an event is one of
 * several under one booking — the Booking's own margin view (Prompt 17)
 * already covers the booking-level service cost; this is specifically
 * the *event-level* picture layered on top of it.
 */
export async function getEventProfit(studioId: string, eventId: string) {
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({ where: { studioId, eventId }, select: { totalAmount: true } }),
    prisma.expense.findMany({ where: { studioId, eventId }, select: { amount: true, gstAmount: true } }),
  ]);

  const revenue = invoices.reduce((sum: number, i: { totalAmount: number }) => sum + i.totalAmount, 0);
  const directCost = expenses.reduce((sum: number, e: { amount: number; gstAmount: number }) => sum + e.amount + e.gstAmount, 0);

  return computeEventGrossProfit({ revenue, directCost });
}

export interface FinancialSummaryFilter {
  from?: Date;
  to?: Date;
}

/** The studio-wide financial picture for a period: revenue, direct cost (expenses tagged to a specific event/booking), overhead (everything else), and gross/net profit computed by the same shared functions `getEventProfit` uses — plus receivables and payables, which are always a *current* snapshot rather than period-filtered, since "what's owed right now" isn't meaningful scoped to a date range the way revenue/cost are. */
export async function getStudioFinancialSummary(studioId: string, filter: FinancialSummaryFilter = {}) {
  const dateFilter = filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined;

  const [invoices, allExpenses, unpaidInvoices, unpaidBills, pendingFreelancerPayments] = await Promise.all([
    prisma.invoice.findMany({ where: { studioId, ...(dateFilter ? { createdAt: dateFilter } : {}) }, select: { totalAmount: true } }),
    prisma.expense.findMany({ where: { studioId, ...(dateFilter ? { incurredOn: dateFilter } : {}) }, select: { amount: true, gstAmount: true, eventId: true, bookingId: true } }),
    prisma.invoice.findMany({ where: { studioId, status: { not: "cancelled" } }, select: { totalAmount: true, amountPaid: true, status: true } }),
    prisma.vendorBill.findMany({ where: { studioId, status: { not: "paid" } }, select: { totalAmount: true, amountPaid: true, status: true } }),
    prisma.freelancerPayment.findMany({ where: { studioId, status: "pending" }, select: { amount: true, status: true } }),
  ]);

  const totalRevenue = invoices.reduce((sum: number, i: { totalAmount: number }) => sum + i.totalAmount, 0);
  const directCost = allExpenses.filter((e: { eventId: string | null; bookingId: string | null }) => e.eventId || e.bookingId).reduce((sum: number, e: { amount: number; gstAmount: number }) => sum + e.amount + e.gstAmount, 0);
  const overhead = allExpenses.filter((e: { eventId: string | null; bookingId: string | null }) => !e.eventId && !e.bookingId).reduce((sum: number, e: { amount: number; gstAmount: number }) => sum + e.amount + e.gstAmount, 0);

  const profit = computeStudioProfitSummary(totalRevenue, directCost, overhead);
  const receivables = computeReceivables(unpaidInvoices);
  const payables = computePayables(unpaidBills, pendingFreelancerPayments);

  return { ...profit, receivables, payables };
}
