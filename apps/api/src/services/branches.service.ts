import { prisma } from "@bcp/database";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";

export async function listBranches(studioId: string) {
  return prisma.studioBranch.findMany({ where: { studioId, deletedAt: null }, orderBy: { createdAt: "asc" } });
}

export async function createBranch(input: {
  studioId: string;
  name: string;
  city?: string;
  state?: string;
  phone?: string;
  isPrimary?: boolean;
  actorId: string;
}) {
  await assertWithinPlanLimit(input.studioId, "maxBranches");

  const existingCount = await prisma.studioBranch.count({ where: { studioId: input.studioId, deletedAt: null } });

  return prisma.studioBranch.create({
    data: {
      studioId: input.studioId,
      name: input.name,
      city: input.city,
      state: input.state,
      phone: input.phone,
      isPrimary: input.isPrimary ?? existingCount === 0, // first branch is primary by default
      createdBy: input.actorId,
    },
  });
}
