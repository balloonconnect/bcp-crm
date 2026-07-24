import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "@bcp/config";
import { QUEUE_DEFINITIONS } from "@bcp/queue";

const env = getEnv();
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

/**
 * Queue names and their retry/backoff behavior are centralized here
 * (and, at the source, in `@bcp/queue`'s `QUEUE_DEFINITIONS`) so
 * producers (`apps/api`'s enqueue helpers) and consumers (this app's
 * `.worker.ts` files) never drift out of sync on either a queue's
 * name or how many times it should retry. `attempts`/`backoff` are
 * BullMQ's own native retry mechanism — configured per-queue from the
 * shared registry rather than left at BullMQ's defaults.
 */
export const queues = Object.fromEntries(
  QUEUE_DEFINITIONS.map((def) => [
    toCamelCase(def.key),
    new Queue(def.key, { connection, defaultJobOptions: { attempts: def.maxAttempts, backoff: { type: "exponential", delay: def.baseBackoffMs } } }),
  ]),
) as Record<string, Queue>;

/** "Dead-letter queue" — a genuine, separate BullMQ queue jobs are moved into once their own queue's attempts are exhausted, so a dead-lettered job is inspectable (and re-enqueueable) independent of the queue it originally failed in, rather than just a status flag on an otherwise-invisible row. */
export const deadLetterQueue = new Queue("dead-letter", { connection });

function toCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
