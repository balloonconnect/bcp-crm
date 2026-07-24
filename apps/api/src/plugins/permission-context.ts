import { prisma } from "@bcp/database";
import { flattenStudioPermissions, flattenPlatformPermissions } from "@bcp/permissions";
import type { StudioPermissionContext, PlatformPermissionContext, PlatformRoleKey } from "@bcp/permissions";
import type { RequestAuth } from "./tenant-context";

type RoleWithPermissions = { key: string; permissions: string[] };

/**
 * Loads and flattens the acting studio user's roles into the
 * StudioPermissionContext shape @bcp/permissions expects. Called fresh on
 * every request that needs a permission check — permissions are never
 * cached in the JWT, so a role change takes effect on the very next
 * request, not at the session's next refresh.
 */
export async function loadStudioPermissionContext(
  auth: RequestAuth,
): Promise<StudioPermissionContext | null> {
  if (auth.actorType !== "studio_user" || !auth.studioId) return null;

  const user = await prisma.studioUser.findFirst({
    where: { id: auth.actorId, studioId: auth.studioId, deletedAt: null },
    select: {
      branchId: true,
      roles: { select: { studioRole: { select: { key: true, permissions: true } } } },
    },
  });
  if (!user) return null;

  const roles: RoleWithPermissions[] = user.roles.map((r: { studioRole: RoleWithPermissions }) => r.studioRole);
  return {
    actorType: "studio_user",
    studioUserId: auth.actorId,
    studioId: auth.studioId,
    branchId: user.branchId,
    roleKeys: roles.map((r) => r.key),
    permissions: flattenStudioPermissions(roles),
  };
}

export async function loadPlatformPermissionContext(
  auth: RequestAuth,
): Promise<PlatformPermissionContext | null> {
  if (auth.actorType !== "platform_user") return null;

  const user = await prisma.platformUser.findFirst({
    where: { id: auth.actorId, deletedAt: null },
    select: {
      roles: { select: { platformRole: { select: { key: true, permissions: true } } } },
    },
  });
  if (!user) return null;

  const roles: RoleWithPermissions[] = user.roles.map((r: { platformRole: RoleWithPermissions }) => r.platformRole);
  return {
    actorType: "platform_user",
    platformUserId: auth.actorId,
    roleKeys: roles.map((r) => r.key) as PlatformRoleKey[],
    permissions: flattenPlatformPermissions(roles),
  };
}
