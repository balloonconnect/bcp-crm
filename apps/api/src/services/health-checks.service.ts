import IORedis from "ioredis";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import type { HealthStatus } from "@bcp/observability";
import { MONITORED_SERVICES } from "@bcp/observability";

export interface ServiceCheckResult {
  service: string;
  status: HealthStatus;
  latencyMs: number | null;
  errorMessage: string | null;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

/** "Database health" — the same live `SELECT 1` this platform's existing (Prompt-earlier) health rollup already used, just reused here as one check among eight rather than the only one. */
async function checkDatabase(): Promise<ServiceCheckResult> {
  try {
    const { latencyMs } = await timed(() => prisma.$queryRaw`SELECT 1`);
    return { service: "database", status: latencyMs > 1000 ? "degraded" : "healthy", latencyMs, errorMessage: null };
  } catch (error) {
    return { service: "database", status: "unhealthy", latencyMs: null, errorMessage: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** "Redis health" — a real PING against the same Redis instance the queue system (Prompt 44) connects to, not a separate, differently-configured client. */
async function checkRedis(): Promise<ServiceCheckResult> {
  const env = getEnv();
  const client = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 3000, lazyConnect: true });
  try {
    const { latencyMs } = await timed(async () => {
      await client.connect();
      await client.ping();
    });
    return { service: "redis", status: latencyMs > 500 ? "degraded" : "healthy", latencyMs, errorMessage: null };
  } catch (error) {
    return { service: "redis", status: "unhealthy", latencyMs: null, errorMessage: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    client.disconnect();
  }
}

/** "Storage health" — a lightweight existence check against the configured bucket, not a full upload/download round-trip that would itself consume storage and bandwidth on every health-check cycle. */
async function checkStorage(): Promise<ServiceCheckResult> {
  const env = getEnv();
  try {
    const storage = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
    const { latencyMs } = await timed(() => storage.headBucket());
    return { service: "storage", status: latencyMs > 1000 ? "degraded" : "healthy", latencyMs, errorMessage: null };
  } catch (error) {
    return { service: "storage", status: "unhealthy", latencyMs: null, errorMessage: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * "AI provider health" / "WhatsApp health" / "Payment provider
 * health" — deliberately configuration checks, not live pings. A
 * real network call to Claude, the WhatsApp Cloud API, or Razorpay on
 * every health-check cycle would burn real quota/cost purely to
 * confirm the platform is up — the honest, useful signal a health
 * dashboard needs is "are the credentials this feature needs actually
 * present," which is what would make the feature unhealthy the
 * moment someone tries to use it anyway.
 */
function checkConfiguredCredential(service: string, isConfigured: boolean): ServiceCheckResult {
  return { service, status: isConfigured ? "healthy" : "degraded", latencyMs: null, errorMessage: isConfigured ? null : "Not configured for this environment" };
}

async function checkQueue(): Promise<ServiceCheckResult> {
  try {
    const { result: staleCount, latencyMs } = await timed<number>(() =>
      prisma.jobRecord.count({ where: { status: { in: ["queued", "retrying"] }, createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } }),
    );
    return { service: "queue", status: staleCount > 20 ? "unhealthy" : staleCount > 0 ? "degraded" : "healthy", latencyMs, errorMessage: staleCount > 0 ? `${staleCount} job(s) queued for over 30 minutes` : null };
  } catch (error) {
    return { service: "queue", status: "unhealthy", latencyMs: null, errorMessage: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Runs every check named in `@bcp/observability`'s `MONITORED_SERVICES` registry and persists each result — the raw material the platform health dashboard, alert rules, and uptime tracking all read from. */
export async function runAllHealthChecks(): Promise<ServiceCheckResult[]> {
  const env = getEnv();

  const results = await Promise.all([
    Promise.resolve<ServiceCheckResult>({ service: "api", status: "healthy", latencyMs: 0, errorMessage: null }), // if this code is running at all, the API process itself is up
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    Promise.resolve(checkConfiguredCredential("ai_provider", Boolean(env.ANTHROPIC_API_KEY))),
    Promise.resolve(checkConfiguredCredential("whatsapp", Boolean(env.WHATSAPP_ACCESS_TOKEN))),
    Promise.resolve(checkConfiguredCredential("payment_provider", Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET))),
    checkQueue(),
  ]);

  await prisma.serviceHealthCheck.createMany({
    data: results.map((r) => ({ service: r.service as never, status: r.status as never, latencyMs: r.latencyMs, errorMessage: r.errorMessage })),
  });

  return results;
}

export function getMonitoredServiceKeys(): string[] {
  return MONITORED_SERVICES.map((s) => s.key);
}
