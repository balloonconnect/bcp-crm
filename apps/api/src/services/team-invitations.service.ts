import { prisma } from "@bcp/database";
import { generateOpaqueToken } from "@bcp/auth";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { sendAuthEmail } from "./notify";
import { getEnv } from "@bcp/config";

const INVITATION_TTL_DAYS = 7;

export class RoleNotFoundError extends Error {
  readonly code = "ROLE_NOT_FOUND";
  constructor() {
    super("Studio role not found");
    this.name = "RoleNotFoundError";
  }
}

export async function listInvitations(studioId: string) {
  return prisma.invitation.findMany({
    where: { studioId },
    include: { role: { select: { name: true, key: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Creates an Invitation and emails the link — this is the "send an
 * invitation" half of the flow @bcp/auth's `acceptInvitation` (built in
 * the authentication phase) completes. Enforces the studio's `maxUsers`
 * plan limit before creating the row, same as the acceptance side does
 * again at the moment the invite is actually accepted (defense in depth —
 * a studio could invite more people than seats allow and have some
 * invitations simply fail to redeem later, but checking here gives
 * earlier, clearer feedback).
 */
export async function createInvitation(input: {
  studioId: string;
  email: string;
  roleKey: string;
  branchId?: string;
  invitedBy: string;
}) {
  await assertWithinPlanLimit(input.studioId, "maxUsers");

  const role = await prisma.studioRole.findUnique({
    where: { studioId_key: { studioId: input.studioId, key: input.roleKey } },
  });
  if (!role) throw new RoleNotFoundError();

  const token = generateOpaqueToken(24);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      studioId: input.studioId,
      email: input.email,
      roleId: role.id,
      branchId: input.branchId,
      token,
      expiresAt,
      invitedBy: input.invitedBy,
    },
  });

  const appUrl = getEnv().APP_URL;
  await sendAuthEmail({
    to: input.email,
    subject: "You're invited to join a studio on BCP Studio OS",
    html: `<p>You've been invited to join as ${role.name}. <a href="${appUrl}/accept-invitation?token=${token}">Accept your invitation</a></p><p>This link expires in ${INVITATION_TTL_DAYS} days.</p>`,
  });

  return invitation;
}

export async function revokeInvitation(invitationId: string, studioId: string) {
  return prisma.invitation.updateMany({
    where: { id: invitationId, studioId, status: "pending" },
    data: { status: "revoked", revokedAt: new Date() },
  });
}
