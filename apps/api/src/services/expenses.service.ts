import { prisma } from "@bcp/database";
import { computeNextOccurrence } from "@bcp/workflow";
import { recordActivity } from "./activity-log.service";

export class ExpenseNotFoundError extends Error {
  readonly code = "EXPENSE_NOT_FOUND";
  constructor() {
    super("Expense not found");
    this.name = "ExpenseNotFoundError";
  }
}

export interface ExpenseInput {
  branchId?: string;
  eventId?: string;
  bookingId?: string;
  vendorId?: string;
  costCentreId?: string;
  category: string;
  amount: number;
  gstAmount?: number;
  tdsAmount?: number;
  incurredOn: string;
  notes?: string;
  receiptFileKey?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
}

export async function listExpenses(studioId: string, filter?: { from?: Date; to?: Date; eventId?: string; approvalStatus?: string }) {
  return prisma.expense.findMany({
    where: {
      studioId,
      ...(filter?.from || filter?.to ? { incurredOn: { gte: filter.from, lte: filter.to } } : {}),
      ...(filter?.eventId ? { eventId: filter.eventId } : {}),
      ...(filter?.approvalStatus ? { approvalStatus: filter.approvalStatus as never } : {}),
    },
    include: { vendor: { select: { id: true, name: true } }, costCentre: { select: { id: true, name: true } } },
    orderBy: { incurredOn: "desc" },
  });
}

export async function getExpense(studioId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, studioId }, include: { vendor: { select: { id: true, name: true } }, costCentre: { select: { id: true, name: true } } } });
  if (!expense) throw new ExpenseNotFoundError();
  return expense;
}

/** An event expense vs. a general expense is just whether eventId/bookingId is set — approval defaults to "not_required" unless the studio explicitly requests approval via updateExpenseApproval; a studio without an approval workflow shouldn't have every expense blocked pending sign-off by default. */
export async function createExpense(studioId: string, input: ExpenseInput, actorId: string, requireApproval = false) {
  const expense = await prisma.expense.create({
    data: {
      studioId,
      branchId: input.branchId,
      eventId: input.eventId,
      bookingId: input.bookingId,
      vendorId: input.vendorId,
      costCentreId: input.costCentreId,
      category: input.category as never,
      amount: input.amount,
      gstAmount: input.gstAmount ?? 0,
      tdsAmount: input.tdsAmount ?? 0,
      incurredOn: new Date(input.incurredOn),
      notes: input.notes,
      receiptFileKey: input.receiptFileKey,
      approvalStatus: requireApproval ? "pending" : "not_required",
      isRecurring: input.isRecurring ?? false,
      recurrenceFrequency: input.recurrenceFrequency as never,
      recurrenceInterval: input.recurrenceInterval,
      createdBy: actorId,
    },
  });

  await recordActivity({ studioId, actorId, action: "expense.logged", resourceType: "Expense", resourceId: expense.id, metadata: { category: expense.category, amount: expense.amount } });
  return expense;
}

export async function updateExpense(studioId: string, expenseId: string, input: Partial<ExpenseInput>, actorId: string) {
  const existing = await prisma.expense.findFirst({ where: { id: expenseId, studioId } });
  if (!existing) throw new ExpenseNotFoundError();

  await prisma.expense.updateMany({
    where: { id: expenseId, studioId },
    data: { ...input, category: input.category as never, incurredOn: input.incurredOn ? new Date(input.incurredOn) : undefined, recurrenceFrequency: input.recurrenceFrequency as never },
  });
  await recordActivity({ studioId, actorId, action: "expense.updated", resourceType: "Expense", resourceId: expenseId });
  return getExpense(studioId, expenseId);
}

export async function decideExpenseApproval(studioId: string, expenseId: string, decision: "approved" | "rejected", actorId: string) {
  await prisma.expense.updateMany({ where: { id: expenseId, studioId }, data: { approvalStatus: decision, approvedByUserId: actorId, approvedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: `expense.${decision}`, resourceType: "Expense", resourceId: expenseId });
  return getExpense(studioId, expenseId);
}

export async function updateExpensePaymentStatus(studioId: string, expenseId: string, status: string, actorId: string) {
  await prisma.expense.updateMany({ where: { id: expenseId, studioId }, data: { paymentStatus: status as never } });
  await recordActivity({ studioId, actorId, action: "expense.payment_status_changed", resourceType: "Expense", resourceId: expenseId, metadata: { status } });
  return getExpense(studioId, expenseId);
}

/** Marking a recurring expense's occurrence handled spawns the next one — same "spawn on completion, not on a timer" approach `tasks.service.ts` uses for recurring tasks, reusing `@bcp/workflow`'s calendar-arithmetic `computeNextOccurrence()` directly rather than duplicating it. */
export async function spawnNextRecurringExpense(studioId: string, expenseId: string, actorId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, studioId } });
  if (!expense || !expense.isRecurring || !expense.recurrenceFrequency || !expense.recurrenceInterval) throw new ExpenseNotFoundError();

  const nextDate = computeNextOccurrence(expense.incurredOn, expense.recurrenceFrequency as never, expense.recurrenceInterval);

  const next = await prisma.expense.create({
    data: {
      studioId,
      branchId: expense.branchId,
      eventId: expense.eventId,
      bookingId: expense.bookingId,
      vendorId: expense.vendorId,
      costCentreId: expense.costCentreId,
      category: expense.category,
      amount: expense.amount,
      gstAmount: expense.gstAmount,
      tdsAmount: expense.tdsAmount,
      incurredOn: nextDate,
      notes: expense.notes,
      isRecurring: true,
      recurrenceFrequency: expense.recurrenceFrequency,
      recurrenceInterval: expense.recurrenceInterval,
      createdBy: actorId,
    },
  });

  await recordActivity({ studioId, actorId, action: "expense.recurrence_spawned", resourceType: "Expense", resourceId: next.id, metadata: { fromExpenseId: expenseId } });
  return next;
}
