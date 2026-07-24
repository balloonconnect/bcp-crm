/**
 * Resolves which studio a request is acting on. This is the single most
 * security-critical function in the auth package — read
 * docs/authentication.md § "Never trust studioId from the browser" before
 * changing it.
 *
 * The result is built from exactly three sources, matching the platform's
 * tenant-isolation requirement:
 *
 *   1. **Secure server session** — `sessionStudioId`, read from the signed,
 *      server-issued access token / Session row established at login.
 *      This function's signature doesn't even accept a studioId argument
 *      from anywhere else — there is no parameter a route handler could
 *      accidentally wire up to a request body/query/header value.
 *   2. **Verified hostname** — if the request came in on a custom domain,
 *      that domain's studio (looked up from `StudioDomain`, only rows with
 *      `verifiedAt` set) must agree with the session's studio, or the
 *      request is rejected. This catches session-replay-across-domains and
 *      routing misconfiguration, not just malicious input.
 *   3. **Authenticated membership** — the actor must have an active,
 *      non-revoked `StudioUserRole` in that exact studio. A valid session
 *      for studio A never grants any access to studio B, even accidentally.
 *
 * All three checks must pass. The DB lookups themselves are injected as
 * callbacks so this function has no Prisma dependency and is fully
 * unit-testable — see apps/api/src/plugins/tenant-context.ts for the real
 * callbacks backed by @bcp/database.
 */
export interface TenantResolutionInput {
  actorId: string;
  /** From the verified session only — never a client-supplied parameter. */
  sessionStudioId: string | null;
  /** The request's Host header, if any. */
  hostname: string | null;
  resolveStudioIdForHostname: (hostname: string) => Promise<string | null> | string | null;
  hasActiveMembership: (actorId: string, studioId: string) => Promise<boolean> | boolean;
}

export type TenantResolutionFailureReason =
  | "no_session_studio"
  | "hostname_mismatch"
  | "no_membership";

export type TenantResolutionResult =
  | { ok: true; studioId: string }
  | { ok: false; reason: TenantResolutionFailureReason };

export async function resolveTenantContext(
  input: TenantResolutionInput,
): Promise<TenantResolutionResult> {
  if (!input.sessionStudioId) {
    return { ok: false, reason: "no_session_studio" };
  }

  if (input.hostname) {
    const hostnameStudioId = await input.resolveStudioIdForHostname(input.hostname);
    if (hostnameStudioId && hostnameStudioId !== input.sessionStudioId) {
      return { ok: false, reason: "hostname_mismatch" };
    }
  }

  const hasMembership = await input.hasActiveMembership(input.actorId, input.sessionStudioId);
  if (!hasMembership) {
    return { ok: false, reason: "no_membership" };
  }

  return { ok: true, studioId: input.sessionStudioId };
}

export class TenantResolutionError extends Error {
  readonly code = "TENANT_RESOLUTION_FAILED";
  constructor(public readonly reason: TenantResolutionFailureReason) {
    super(`Tenant resolution failed: ${reason}`);
    this.name = "TenantResolutionError";
  }
}

export async function assertTenantContext(
  input: TenantResolutionInput,
): Promise<string> {
  const result = await resolveTenantContext(input);
  if (!result.ok) {
    throw new TenantResolutionError(result.reason);
  }
  return result.studioId;
}
