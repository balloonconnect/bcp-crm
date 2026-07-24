import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as branches from "../services/branches.service";
import * as team from "../services/team-invitations.service";
import * as customers from "../services/customers.service";
import * as settings from "../services/studio-settings.service";

const branchSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  isPrimary: z.boolean().optional(),
});

const invitationSchema = z.object({
  email: z.string().email(),
  roleKey: z.string(),
  branchId: z.string().uuid().optional(),
});

const importSchema = z.object({
  customers: z.array(z.object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional() })),
});

export async function studioManagementRoutes(app: FastifyInstance) {
  // ── Branches ──────────────────────────────────────────────────────────
  app.get("/branches", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await branches.listBranches(request.auth!.studioId!),
  }));

  app.post(
    "/branches",
    { preHandler: [app.authenticate, requireStudioPermission("branch:manage")] },
    async (request) => {
      const body = branchSchema.parse(request.body);
      const branch = await branches.createBranch({ ...body, studioId: request.auth!.studioId!, actorId: request.auth!.actorId });
      return { ok: true, data: branch };
    },
  );

  // ── Team invitations ─────────────────────────────────────────────────
  app.get(
    "/team/invitations",
    { preHandler: [app.authenticate, requireStudioPermission("user:manage")] },
    async (request) => ({ ok: true, data: await team.listInvitations(request.auth!.studioId!) }),
  );

  app.post(
    "/team/invitations",
    { preHandler: [app.authenticate, requireStudioPermission("user:manage")] },
    async (request) => {
      const body = invitationSchema.parse(request.body);
      const invitation = await team.createInvitation({ ...body, studioId: request.auth!.studioId!, invitedBy: request.auth!.actorId });
      return { ok: true, data: invitation };
    },
  );

  app.post(
    "/team/invitations/:invitationId/revoke",
    { preHandler: [app.authenticate, requireStudioPermission("user:manage")] },
    async (request) => {
      const { invitationId } = z.object({ invitationId: z.string().uuid() }).parse(request.params);
      await team.revokeInvitation(invitationId, request.auth!.studioId!);
      return { ok: true, data: null };
    },
  );

  // ── Customers ─────────────────────────────────────────────────────────
  app.get("/customers", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await customers.listClients(request.auth!.studioId!),
  }));

  app.post("/customers/import", { preHandler: [app.authenticate] }, async (request) => {
    const body = importSchema.parse(request.body);
    const result = await customers.importCustomers(request.auth!.studioId!, body.customers, request.auth!.actorId);
    return { ok: true, data: result };
  });

  app.post("/customers", { preHandler: [app.authenticate] }, async (request) => {
    const body = z.object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional(), notes: z.string().optional() }).parse(request.body);
    const client = await customers.createClient({ ...body, studioId: request.auth!.studioId!, actorId: request.auth!.actorId });
    return { ok: true, data: client };
  });

  // ── Settings (generic key/value — GST, bank, UPI, services, packages, payment gateway) ──
  app.get("/settings", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await settings.listStudioSettings(request.auth!.studioId!),
  }));

  app.get("/settings/:key", { preHandler: [app.authenticate] }, async (request) => {
    const { key } = z.object({ key: z.string() }).parse(request.params);
    return { ok: true, data: await settings.getStudioSetting(request.auth!.studioId!, key) };
  });
}
