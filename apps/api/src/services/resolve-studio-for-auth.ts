import { prisma } from "@bcp/database";

/**
 * Pre-authentication studio resolution — used only by login/signup/otp-
 * request routes, where there is no session yet to resolve a tenant from.
 * This is NOT the same trust boundary as tenant-context.ts: a studio slug
 * or hostname here only selects *which studio's user table to check
 * credentials against*. Supplying the wrong one just means "no matching
 * account found" — it grants no access to anything. The moment
 * credentials are verified, every subsequent authenticated request goes
 * through tenant-context.ts's full three-source resolution instead. See
 * docs/authentication.md § "Studio resolution before login" for the
 * distinction.
 */
export async function resolveStudioIdForAuth(input: {
  hostname: string | null;
  studioSlug?: string;
}): Promise<string | null> {
  if (input.hostname) {
    const domain = await prisma.studioDomain.findFirst({
      where: { domain: input.hostname, status: "active", deletedAt: null },
      select: { studioId: true },
    });
    if (domain) return domain.studioId;
  }

  if (input.studioSlug) {
    const studio = await prisma.studio.findUnique({
      where: { slug: input.studioSlug },
      select: { id: true, status: true, deletedAt: true },
    });
    if (studio && !studio.deletedAt) return studio.id;
  }

  return null;
}
