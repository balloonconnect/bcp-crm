import { describe, expect, it, vi } from "vitest";
import { resolveTenantContext, assertTenantContext, TenantResolutionError } from "../tenant-resolution";

const STUDIO_A = "studio-a";
const STUDIO_B = "studio-b";

describe("resolveTenantContext", () => {
  it("fails when the session carries no studioId at all", async () => {
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: null,
      hostname: null,
      resolveStudioIdForHostname: () => null,
      hasActiveMembership: () => true,
    });
    expect(result).toEqual({ ok: false, reason: "no_session_studio" });
  });

  it("succeeds when session studioId, hostname, and membership all agree", async () => {
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: "studio-a.example.com",
      resolveStudioIdForHostname: () => STUDIO_A,
      hasActiveMembership: () => true,
    });
    expect(result).toEqual({ ok: true, studioId: STUDIO_A });
  });

  it("succeeds when there's no custom-domain hostname to cross-check", async () => {
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: "app.bcpstudio.os", // generic app host, not a tenant custom domain
      resolveStudioIdForHostname: () => null,
      hasActiveMembership: () => true,
    });
    expect(result).toEqual({ ok: true, studioId: STUDIO_A });
  });

  it("rejects when the verified hostname belongs to a different studio than the session", async () => {
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: "studio-b.example.com",
      resolveStudioIdForHostname: () => STUDIO_B,
      hasActiveMembership: () => true,
    });
    expect(result).toEqual({ ok: false, reason: "hostname_mismatch" });
  });

  it("rejects when the actor has no active membership in the session's studio", async () => {
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: null,
      resolveStudioIdForHostname: () => null,
      hasActiveMembership: () => false,
    });
    expect(result).toEqual({ ok: false, reason: "no_membership" });
  });

  it("never derives studioId from anything other than sessionStudioId, even if callbacks would allow another studio", async () => {
    const hasActiveMembership = vi.fn().mockReturnValue(true);
    const result = await resolveTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: null,
      resolveStudioIdForHostname: () => null,
      hasActiveMembership,
    });
    expect(result).toEqual({ ok: true, studioId: STUDIO_A });
    // the membership check was made against the session's studio, not anything else
    expect(hasActiveMembership).toHaveBeenCalledWith("u1", STUDIO_A);
  });
});

describe("assertTenantContext", () => {
  it("returns the studioId on success", async () => {
    const studioId = await assertTenantContext({
      actorId: "u1",
      sessionStudioId: STUDIO_A,
      hostname: null,
      resolveStudioIdForHostname: () => null,
      hasActiveMembership: () => true,
    });
    expect(studioId).toBe(STUDIO_A);
  });

  it("throws TenantResolutionError on failure", async () => {
    await expect(
      assertTenantContext({
        actorId: "u1",
        sessionStudioId: null,
        hostname: null,
        resolveStudioIdForHostname: () => null,
        hasActiveMembership: () => true,
      }),
    ).rejects.toThrow(TenantResolutionError);
  });
});
