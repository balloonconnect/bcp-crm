import { PrismaClient } from "../generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __bcpPrisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client. Reused across hot reloads in dev to avoid
 * exhausting Postgres connections.
 */
export const prisma = globalThis.__bcpPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__bcpPrisma = prisma;
}
