import { prisma } from "@bcp/database";
import { dashboardLayoutSchema, defaultLayout, reconcileLayout, type DashboardLayout } from "@bcp/dashboard";
import { getUsageSnapshot } from "./plan-limit-enforcement";
import { listRecentActivity } from "./activity-log.service";

function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function dayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * One function computing every widget's data in parallel — the API
 * surface is a single `GET /dashboard/summary` rather than 19 separate
 * round trips, so the dashboard loads in one request on a slow mobile
 * connection. Each widget's query is intentionally simple (counts and
 * small `take` limits, no cross-widget joins) so this stays fast as
 * data grows; a studio with years of history doesn't make "today's
 * shoots" slower to compute.
 */
export async function getDashboardSummary(studioId: string) {
  const now = new Date();
  const today = dayRange(now);
  const month = monthRange(now);
  const in7Days = new Date(today.end.getTime() + 6 * 24 * 60 * 60 * 1000);

  const [
    todaysShoots,
    upcomingEvents,
    newEnquiriesCount,
    followUpsDue,
    pendingQuotations,
    confirmedBookingsCount,
    pendingPayments,
    overduePayments,
    editingPending,
    albumSelectionPendingCount,
    printingPendingCount,
    galleryDeliveryPendingCount,
    storageUsage,
    monthlyRevenueAgg,
    monthlyExpenseAgg,
    activeTeamCount,
    busyTodayUserIds,
    recentActivity,
  ] = await Promise.all([
    prisma.event.findMany({
      where: { studioId, deletedAt: null, scheduledAt: { gte: today.start, lt: today.end }, status: { not: "cancelled" } },
      include: { assignments: { include: { studioUser: { select: { id: true, name: true } } } }, client: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.event.findMany({
      where: { studioId, deletedAt: null, status: "confirmed", scheduledAt: { gte: today.end, lte: in7Days } },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    prisma.lead.count({ where: { studioId, deletedAt: null, status: "new" } }),
    prisma.lead.findMany({
      where: { studioId, deletedAt: null, followUpAt: { lte: today.end }, status: { notIn: ["won", "lost"] } },
      orderBy: { followUpAt: "asc" },
      take: 10,
    }),
    prisma.quotation.findMany({ where: { studioId, status: "sent" }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.event.count({ where: { studioId, deletedAt: null, status: "confirmed" } }),
    prisma.invoice.findMany({
      where: { studioId, status: { in: ["unpaid", "partially_paid"] }, OR: [{ dueDate: null }, { dueDate: { gte: now } }] },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: { studioId, status: { in: ["unpaid", "partially_paid"] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.event.findMany({
      where: { studioId, deletedAt: null, status: "completed", editingStatus: { not: "completed" } },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    }),
    prisma.album.count({ where: { studioId, status: { in: ["pending_selection", "selection_in_progress"] } } }),
    prisma.album.count({ where: { studioId, status: "printing" } }),
    prisma.gallery.count({ where: { studioId, status: "uploaded" } }),
    getUsageSnapshot(studioId, "maxStorageGb"),
    prisma.clientPayment.aggregate({ where: { studioId, paidAt: { gte: month.start, lt: month.end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { studioId, incurredOn: { gte: month.start, lt: month.end } }, _sum: { amount: true } }),
    prisma.studioUser.count({ where: { studioId, status: "active", deletedAt: null } }),
    prisma.eventAssignment.findMany({
      where: { event: { studioId, scheduledAt: { gte: today.start, lt: today.end }, status: { not: "cancelled" } } },
      select: { studioUserId: true },
      distinct: ["studioUserId"],
    }),
    listRecentActivity(studioId, 10),
  ]);

  const monthlyRevenue = monthlyRevenueAgg._sum.amount ?? 0;
  const monthlyExpense = monthlyExpenseAgg._sum.amount ?? 0;
  const busyCount = busyTodayUserIds.length;

  const recommendations = buildRecommendations({
    overdueCount: overduePayments.length,
    followUpsDueCount: followUpsDue.length,
    pendingQuotationsCount: pendingQuotations.length,
    editingPendingCount: editingPending.length,
    galleryDeliveryPendingCount,
    newEnquiriesCount,
  });

  return {
    todays_shoots: todaysShoots,
    upcoming_events: upcomingEvents,
    new_enquiries: { count: newEnquiriesCount },
    follow_ups_due: followUpsDue,
    pending_quotations: pendingQuotations,
    confirmed_bookings: { count: confirmedBookingsCount },
    pending_payments: pendingPayments,
    overdue_payments: overduePayments,
    editing_pending: editingPending,
    album_selection_pending: { count: albumSelectionPendingCount },
    printing_pending: { count: printingPendingCount },
    gallery_delivery_pending: { count: galleryDeliveryPendingCount },
    storage_usage: storageUsage,
    monthly_revenue: { amount: monthlyRevenue },
    monthly_expense: { amount: monthlyExpense },
    estimated_profit: { amount: monthlyRevenue - monthlyExpense },
    team_availability: { active: activeTeamCount, busyToday: busyCount, availableToday: Math.max(activeTeamCount - busyCount, 0) },
    recent_activity: recentActivity,
    ai_recommendations: recommendations,
  };
}

/**
 * Rule-based, not a trained model — "AI recommendations" is honestly a
 * prioritized nudge list derived from the same aggregates every other
 * widget already computed, not a separate ML feature. See
 * docs/studio-dashboard.md for why, and what a real recommendation
 * engine (built on `@bcp/ai`'s Claude client) would add later.
 */
function buildRecommendations(input: {
  overdueCount: number;
  followUpsDueCount: number;
  pendingQuotationsCount: number;
  editingPendingCount: number;
  galleryDeliveryPendingCount: number;
  newEnquiriesCount: number;
}): { priority: "high" | "medium" | "low"; message: string }[] {
  const recommendations: { priority: "high" | "medium" | "low"; message: string }[] = [];

  if (input.overdueCount > 0) {
    recommendations.push({ priority: "high", message: `${input.overdueCount} invoice${input.overdueCount === 1 ? " is" : "s are"} overdue — send a payment reminder.` });
  }
  if (input.followUpsDueCount > 0) {
    recommendations.push({ priority: "high", message: `${input.followUpsDueCount} lead${input.followUpsDueCount === 1 ? "" : "s"} need${input.followUpsDueCount === 1 ? "s" : ""} a follow-up today.` });
  }
  if (input.newEnquiriesCount > 0) {
    recommendations.push({ priority: "medium", message: `${input.newEnquiriesCount} new enquir${input.newEnquiriesCount === 1 ? "y hasn't" : "ies haven't"} been contacted yet.` });
  }
  if (input.pendingQuotationsCount > 0) {
    recommendations.push({ priority: "medium", message: `${input.pendingQuotationsCount} quotation${input.pendingQuotationsCount === 1 ? "" : "s"} sent and awaiting a response.` });
  }
  if (input.editingPendingCount > 0) {
    recommendations.push({ priority: "low", message: `${input.editingPendingCount} completed shoot${input.editingPendingCount === 1 ? "" : "s"} still need${input.editingPendingCount === 1 ? "s" : ""} editing.` });
  }
  if (input.galleryDeliveryPendingCount > 0) {
    recommendations.push({ priority: "low", message: `${input.galleryDeliveryPendingCount} gallery/galleries ready to deliver to clients.` });
  }
  if (recommendations.length === 0) {
    recommendations.push({ priority: "low", message: "Nothing urgent outstanding — you're caught up." });
  }

  return recommendations;
}

// ── Layout preferences ───────────────────────────────────────────────────

export async function getDashboardLayout(studioUserId: string): Promise<DashboardLayout> {
  const preference = await prisma.dashboardPreference.findUnique({ where: { studioUserId } });
  if (!preference) return defaultLayout();
  return reconcileLayout(preference.layout as DashboardLayout);
}

export async function saveDashboardLayout(studioId: string, studioUserId: string, layout: unknown): Promise<DashboardLayout> {
  const parsed = dashboardLayoutSchema.parse(layout);

  await prisma.dashboardPreference.upsert({
    where: { studioUserId },
    update: { layout: parsed },
    create: { studioId, studioUserId, layout: parsed },
  });

  return parsed;
}
