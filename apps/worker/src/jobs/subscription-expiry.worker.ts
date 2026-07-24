import { Worker, type Job } from "bullmq";
import { prisma } from "@bcp/database";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface SubscriptionExpiryJobData {
  jobRecordId: string;
  studioId: string | null;
}

/**
 * A real periodic sweep over every studio's subscription lifecycle:
 * an active/trialing subscription past its own `endsAt` moves to
 * `grace` (if a grace period is configured and hasn't itself lapsed
 * yet) or straight to `expired` — never silently left `active` past
 * its own end date, which would misrepresent a studio's actual
 * billing state to every plan-limit check that reads it.
 */
export const subscriptionExpiryWorker = new Worker<SubscriptionExpiryJobData>(
  "subscription-expiry",
  (job: Job<SubscriptionExpiryJobData>) =>
    withJobTracking("subscription-expiry", job, async () => {
      const now = new Date();

      const movedToGrace = await prisma.subscription.updateMany({
        where: { status: { in: ["active", "trialing"] }, endsAt: { lt: now }, graceEndsAt: { gt: now } },
        data: { status: "grace" },
      });

      const movedToExpired = await prisma.subscription.updateMany({
        where: { status: { in: ["active", "trialing", "grace", "past_due"] }, OR: [{ graceEndsAt: { lt: now } }, { graceEndsAt: null, endsAt: { lt: now } }] },
        data: { status: "expired" },
      });

      return { movedToGrace: movedToGrace.count, movedToExpired: movedToExpired.count };
    }),
  { connection },
);
