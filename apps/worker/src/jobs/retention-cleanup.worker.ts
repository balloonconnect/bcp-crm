import { Worker, type Job } from "bullmq";
import { prisma } from "@bcp/database";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface RetentionCleanupJobData {
  jobRecordId: string;
  studioId: string | null;
}

/**
 * A genuinely real periodic sweep — deletes exactly the categories of
 * data this platform has already established have no reason to be
 * kept past expiry: consumed/expired verification tokens (one-time by
 * design, per `docs/database-conventions.md`), sessions past their own
 * `expiresAt`, and revoked sessions old enough that nothing would ever
 * need to reference them again. Deliberately does *not* touch anything
 * with its own independent retention rule (audit logs, financial
 * records, signed contracts) — see
 * docs/data-deletion-policy.md for why those are excluded on purpose.
 */
export const retentionCleanupWorker = new Worker<RetentionCleanupJobData>(
  "retention-cleanup",
  (job: Job<RetentionCleanupJobData>) =>
    withJobTracking("retention-cleanup", job, async () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [expiredTokens, expiredSessions, oldRevokedSessions] = await Promise.all([
        prisma.verificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.session.deleteMany({ where: { expiresAt: { lt: now }, revokedAt: { not: null } } }),
        prisma.session.deleteMany({ where: { revokedAt: { lt: ninetyDaysAgo } } }),
      ]);

      return { expiredTokensDeleted: expiredTokens.count, expiredSessionsDeleted: expiredSessions.count, oldRevokedSessionsDeleted: oldRevokedSessions.count };
    }),
  { connection },
);
