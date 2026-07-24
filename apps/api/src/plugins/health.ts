import type { FastifyInstance } from "fastify";
import { runAllHealthChecks } from "../services/health-checks.service";
import { aggregateOverallHealth } from "@bcp/observability";

export async function healthPlugin(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", service: "api", time: new Date().toISOString() }));
  app.get("/health/ready", async () => ({ status: "ready" }));

  /** "API health" / "Database health" / "Redis health" / "Storage health" / "AI provider health" / "WhatsApp health" / "Payment provider health" / a queue-depth check — every one of the 8 monitored services in a single call, unauthenticated (matching /health above) so an external uptime monitor or load balancer can poll it directly without needing platform credentials. The richer platform-admin dashboard and public status page both read from the *persisted* ServiceHealthCheck history this endpoint also writes, not just this live snapshot. */
  app.get("/health/detailed", async () => {
    const results = await runAllHealthChecks();
    const overall = aggregateOverallHealth(results.map((r) => ({ service: r.service, status: r.status })));
    return { status: overall, services: results, checkedAt: new Date().toISOString() };
  });
}
