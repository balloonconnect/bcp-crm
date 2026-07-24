import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "@bcp/config";
import { QUEUE_DEFINITIONS } from "@bcp/queue";

/**
 * The producer side of the same 14 queues `apps/worker` consumes from
 * — same Redis, same queue names, same per-queue retry/backoff
 * sourced from `@bcp/queue`'s shared registry, so the two apps can
 * never drift on either. `apps/api` only ever enqueues here
 * (`jobs.service.ts`); it never runs a `Worker` itself.
 */
const env = getEnv();
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const jobQueues = Object.fromEntries(
  QUEUE_DEFINITIONS.map((def) => [
    def.key,
    new Queue(def.key, { connection, defaultJobOptions: { attempts: def.maxAttempts, backoff: { type: "exponential", delay: def.baseBackoffMs } } }),
  ]),
) as Record<string, Queue>;
