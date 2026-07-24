import { prisma } from "@bcp/database";
import { getEnv } from "@bcp/config";

/**
 * The CORS origin resolver — replaces the previous `origin: true`
 * registration, which reflected *any* requesting origin back
 * verbatim while also allowing credentials. That combination is a
 * textbook CORS misconfiguration: it means any website on the
 * internet could make credentialed requests against this API from a
 * victim's browser. This resolves an explicit allowlist instead —
 * the platform's own known frontend origins (from
 * `CORS_ALLOWED_ORIGINS`), plus any origin that is a studio's own
 * *verified* custom domain, checked against the database on each
 * request rather than cached indefinitely (a domain can be
 * unverified or suspended after being allowed once). Everything else
 * is rejected.
 */
export async function resolveCorsOrigin(origin: string | undefined): Promise<boolean> {
  if (!origin) return true; // same-origin requests, curl, server-to-server calls — no Origin header at all

  const env = getEnv();
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    const domain = await prisma.studioDomain.findFirst({ where: { domain: hostname, status: { in: ["verified", "active"] } }, select: { id: true } });
    return Boolean(domain);
  } catch {
    return false; // a malformed Origin header is never trusted
  }
}
