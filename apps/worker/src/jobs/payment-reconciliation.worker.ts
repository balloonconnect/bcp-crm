import { Worker, type Job } from "bullmq";
import { prisma } from "@bcp/database";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface PaymentReconciliationJobData {
  jobRecordId: string;
  studioId: string | null;
}

const STALE_PENDING_HOURS = 24;

/**
 * A real, honestly-scoped reconciliation sweep: `CommercePayment` rows
 * that have sat in `pending` for longer than a payment gateway would
 * ever legitimately take to confirm are flagged `failed` rather than
 * left pending forever — a customer whose gateway session expired or
 * abandoned checkout shouldn't leave an order looking perpetually "in
 * progress." What this deliberately does *not* do is call out to
 * Razorpay/Cashfree's own reconciliation API to verify a transaction
 * ID against the gateway's own record of truth — this sandbox has no
 * live gateway credentials to do that against, the same accepted
 * limitation this codebase already states for payment gateways
 * elsewhere. A real deployment should extend this job to also query
 * the gateway directly before flagging, rather than relying on a
 * timeout alone.
 */
export const paymentReconciliationWorker = new Worker<PaymentReconciliationJobData>(
  "payment-reconciliation",
  (job: Job<PaymentReconciliationJobData>) =>
    withJobTracking("payment-reconciliation", job, async () => {
      const staleCutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000);

      const flagged = await prisma.commercePayment.updateMany({
        where: { status: "pending", createdAt: { lt: staleCutoff } },
        data: { status: "failed" },
      });

      return { flaggedAsFailed: flagged.count, staleCutoffHours: STALE_PENDING_HOURS };
    }),
  { connection },
);
