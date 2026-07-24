import type { FastifyReply, FastifyRequest } from "fastify";
import {
  assertCan,
  assertCanAccessBranch,
  type StudioPermissionKey,
  type PlatformPermissionKey,
  type StudioPermissionContext,
  type PlatformPermissionContext,
} from "@bcp/permissions";
import { loadStudioPermissionContext, loadPlatformPermissionContext } from "./permission-context";

declare module "fastify" {
  interface FastifyRequest {
    studioPermissionContext?: StudioPermissionContext;
    platformPermissionContext?: PlatformPermissionContext;
  }
}

/**
 * `requireStudioPermission("booking:manage")` — use as a route preHandler
 * *after* `app.authenticate`. Loads the fresh permission context (never
 * cached) and asserts the permission via @bcp/permissions.
 */
export function requireStudioPermission(permission: StudioPermissionKey) {
  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.auth) {
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED", message: "Not signed in" } });
    }

    const context = await loadStudioPermissionContext(request.auth);
    if (!context) {
      return reply.status(403).send({ ok: false, error: { code: "NO_STUDIO_MEMBERSHIP", message: "No active studio membership" } });
    }

    try {
      assertCan(context, permission);
    } catch {
      return reply.status(403).send({ ok: false, error: { code: "PERMISSION_DENIED", message: `Missing permission: ${permission}` } });
    }

    request.studioPermissionContext = context;
  };
}

export function requirePlatformPermission(permission: PlatformPermissionKey) {
  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.auth) {
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED", message: "Not signed in" } });
    }

    const context = await loadPlatformPermissionContext(request.auth);
    if (!context) {
      return reply.status(403).send({ ok: false, error: { code: "NOT_PLATFORM_STAFF", message: "Not a platform user" } });
    }

    try {
      assertCan(context, permission);
    } catch {
      return reply.status(403).send({ ok: false, error: { code: "PERMISSION_DENIED", message: `Missing permission: ${permission}` } });
    }

    request.platformPermissionContext = context;
  };
}

/**
 * Branch access check for routes with a `:branchId` param. Must run after
 * `requireStudioPermission`, since it reads the context that guard attaches.
 */
export function requireBranchAccess(paramName = "branchId") {
  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    const context = request.studioPermissionContext;
    if (!context) {
      return reply.status(500).send({
        ok: false,
        error: { code: "GUARD_ORDER", message: "requireBranchAccess must run after requireStudioPermission" },
      });
    }

    const targetBranchId = (request.params as Record<string, string>)[paramName];
    try {
      assertCanAccessBranch(context, targetBranchId ?? null);
    } catch {
      return reply.status(403).send({ ok: false, error: { code: "BRANCH_ACCESS_DENIED", message: "No access to this branch" } });
    }
  };
}
