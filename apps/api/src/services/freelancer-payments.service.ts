import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export async function listFreelancerPayments(studioId: string, filter?: { studioUserId?: string; status?: string }) {
  return prisma.freelancerPayment.findMany({
    where: { studioId, ...(filter?.studioUserId ? { studioUserId: filter.studioUserId } : {}), ...(filter?.status ? { status: filter.status as never } : {}) },
    include: { studioUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFreelancerPayment(studioId: string, studioUserId: string, input: { eventId?: string; bookingId?: string; amount: number; dueDate?: string; notes?: string }, actorId: string) {
  const payment = await prisma.freelancerPayment.create({
    data: { studioId, studioUserId, eventId: input.eventId, bookingId: input.bookingId, amount: input.amount, dueDate: input.dueDate ? new Date(input.dueDate) : undefined, notes: input.notes, createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "freelancer_payment.created", resourceType: "StudioUser", resourceId: studioUserId, metadata: { amount: input.amount } });
  return payment;
}

export async function updateFreelancerPaymentStatus(studioId: string, paymentId: string, status: string, actorId: string) {
  const data: Record<string, unknown> = { status };
  if (status === "paid") data.paidAt = new Date();

  await prisma.freelancerPayment.updateMany({ where: { id: paymentId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "freelancer_payment.status_changed", resourceType: "FreelancerPayment", resourceId: paymentId, metadata: { status } });
  return prisma.freelancerPayment.findUnique({ where: { id: paymentId } });
}

/** Studios need to know outstanding freelancer obligations at a glance — this is the "payment tracking" half of the brief, a simple aggregate rather than a full ledger. */
export async function getFreelancerPaymentSummary(studioId: string, studioUserId: string) {
  const payments = await prisma.freelancerPayment.findMany({ where: { studioId, studioUserId }, select: { amount: true, status: true } });
  const totalPending = payments.filter((p: { status: string }) => p.status === "pending").reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const totalPaid = payments.filter((p: { status: string }) => p.status === "paid").reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  return { totalPending, totalPaid };
}
