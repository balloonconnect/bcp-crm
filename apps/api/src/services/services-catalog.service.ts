import { prisma } from "@bcp/database";
import { DEFAULT_SERVICES } from "@bcp/catalog";
import { recordActivity } from "./activity-log.service";

export class ServiceNotFoundError extends Error {
  readonly code = "SERVICE_NOT_FOUND";
  constructor() {
    super("Service not found");
    this.name = "ServiceNotFoundError";
  }
}

export async function listServices(studioId: string, includeInactive = false) {
  return prisma.service.findMany({
    where: { studioId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export interface ServiceInput {
  name: string;
  category: string;
  description?: string;
  internalPrice: number;
  unit?: string;
  isActive?: boolean;
}

export async function createService(studioId: string, input: ServiceInput, actorId: string) {
  const service = await prisma.service.create({
    data: { studioId, name: input.name, category: input.category as never, description: input.description, internalPrice: input.internalPrice, unit: (input.unit as never) ?? "per_event", isActive: input.isActive ?? true, createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "service.created", resourceType: "Service", resourceId: service.id, metadata: { name: service.name } });
  return service;
}

export async function updateService(studioId: string, serviceId: string, input: Partial<ServiceInput>, actorId: string) {
  const existing = await prisma.service.findFirst({ where: { id: serviceId, studioId, deletedAt: null } });
  if (!existing) throw new ServiceNotFoundError();

  await prisma.service.updateMany({ where: { id: serviceId, studioId }, data: { ...input, category: input.category as never, unit: input.unit as never } });
  await recordActivity({ studioId, actorId, action: "service.updated", resourceType: "Service", resourceId: serviceId });
  return prisma.service.findUnique({ where: { id: serviceId } });
}

export async function deleteService(studioId: string, serviceId: string, actorId: string) {
  await prisma.service.updateMany({ where: { id: serviceId, studioId }, data: { deletedAt: new Date(), isActive: false } });
  await recordActivity({ studioId, actorId, action: "service.deleted", resourceType: "Service", resourceId: serviceId });
}

/**
 * One-click seed of the 16 services named in the product brief — a
 * convenience for a new studio, not a fixture; every seeded row is a
 * completely normal `Service` afterward, renameable/repriceable/
 * deletable like anything a studio creates from scratch. Skips any
 * default whose name the studio already has (case-insensitive) so this
 * is safe to click more than once.
 */
export async function seedDefaultServices(studioId: string, actorId: string) {
  const existing = await prisma.service.findMany({ where: { studioId, deletedAt: null }, select: { name: true } });
  const existingNames = new Set(existing.map((s: { name: string }) => s.name.toLowerCase()));

  const toCreate = DEFAULT_SERVICES.filter((s) => !existingNames.has(s.name.toLowerCase()));
  if (toCreate.length === 0) return { created: 0 };

  await prisma.service.createMany({
    data: toCreate.map((s) => ({ studioId, name: s.name, category: s.category as never, unit: s.unit as never, internalPrice: 0, createdBy: actorId })),
  });

  await recordActivity({ studioId, actorId, action: "service.defaults_seeded", resourceType: "Service", resourceId: studioId, metadata: { count: toCreate.length } });

  return { created: toCreate.length };
}
