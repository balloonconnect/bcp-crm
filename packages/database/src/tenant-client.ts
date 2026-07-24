import type { PrismaClient } from "../generated/client";
import {
  isTenantScopedModel,
  scopeWhere,
  scopeData,
  scopeDataArray,
  OPERATIONS_WITH_WHERE,
  OPERATIONS_WITH_CREATE_DATA,
  OPERATIONS_WITH_CREATE_MANY_DATA,
  UPSERT_OPERATION,
} from "./tenant-scope";

/**
 * Wraps a PrismaClient so every query against a tenant-scoped model (see
 * TENANT_SCOPED_MODELS in tenant-scope.ts) automatically has `studioId`
 * merged into its `where`/`data`, and throws CrossTenantAccessError if the
 * caller passed a *different* studioId — catching cross-tenant bugs at the
 * query layer instead of relying on every call site to remember the filter.
 *
 * This is defense in depth, not the only guard — see docs/tenant-isolation.md
 * for the full set of layers (JWT claims, route middleware, this client,
 * and row-level checks in service functions).
 *
 * Usage (typically once per request, scoped to the authenticated studio):
 *
 *   const db = createTenantClient(prisma, session.studioId);
 *   const leads = await db.studioUser.findMany(); // studioId filter is automatic
 */
export function createTenantClient(client: PrismaClient, studioId: string) {
  if (!studioId) {
    throw new Error("createTenantClient requires a non-empty studioId");
  }

  return client.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          const modelName = model.charAt(0).toLowerCase() + model.slice(1);

          if (!isTenantScopedModel(modelName)) {
            return query(args);
          }

          const typedArgs = args;

          if (operation === UPSERT_OPERATION) {
            typedArgs.where = scopeWhere(modelName, typedArgs.where as never, studioId);
            typedArgs.create = scopeData(modelName, typedArgs.create as never, studioId);
            typedArgs.update = scopeData(modelName, typedArgs.update as never, studioId);
            return query(typedArgs);
          }

          if (OPERATIONS_WITH_CREATE_DATA.has(operation)) {
            typedArgs.data = scopeData(modelName, typedArgs.data as never, studioId);
            return query(typedArgs);
          }

          if (OPERATIONS_WITH_CREATE_MANY_DATA.has(operation)) {
            const data = typedArgs.data;
            typedArgs.data = Array.isArray(data)
              ? scopeDataArray(modelName, data as never[], studioId)
              : scopeData(modelName, data as never, studioId);
            return query(typedArgs);
          }

          if (OPERATIONS_WITH_WHERE.has(operation)) {
            typedArgs.where = scopeWhere(modelName, typedArgs.where as never, studioId);
            return query(typedArgs);
          }

          // Unrecognized operation for a tenant-scoped model (e.g. a future
          // Prisma addition) — fail closed rather than silently skip scoping.
          throw new Error(
            `Tenant-scoped client has no scoping rule for "${modelName}.${operation}". ` +
              `Add one in tenant-client.ts before using this operation on a tenant-scoped model.`,
          );
        },
      },
    },
  });
}

export type TenantScopedPrismaClient = ReturnType<typeof createTenantClient>;
