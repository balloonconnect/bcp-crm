import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as domains from "../services/domains.service";
import { requireStudioPermission } from "../plugins/auth-guard";

const addDomainSchema = z.object({
  domain: z.string().min(3).max(253),
  purpose: z.enum(["studio_crm", "client_portal", "gallery", "enquiry_form", "root_website"]),
});
const domainParamsSchema = z.object({ domainId: z.string().uuid() });
const auditQuerySchema = z.object({ domainId: z.string().uuid().optional() });

export async function domainsRoutes(app: FastifyInstance) {
  const guard = [app.authenticate, requireStudioPermission("domain:manage")];

  app.get("/domains", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    return { ok: true, data: await domains.listDomains(auth.studioId!) };
  });

  app.post("/domains", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const body = addDomainSchema.parse(request.body);
    const created = await domains.addDomain({ ...body, studioId: auth.studioId!, actorId: auth.actorId });
    return { ok: true, data: created };
  });

  app.get("/domains/:domainId/dns-instructions", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = domainParamsSchema.parse(request.params);
    const domainList = await domains.listDomains(auth.studioId!);
    const domain = domainList.find((d: { id: string }) => d.id === domainId);
    if (!domain) {
      return { ok: false, error: { code: "DOMAIN_NOT_FOUND", message: "Domain not found" } };
    }
    return { ok: true, data: domains.getDnsInstructions(domain) };
  });

  app.post("/domains/:domainId/verify", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = domainParamsSchema.parse(request.params);
    const updated = await domains.verifyDomain(domainId, auth.studioId!, auth.actorId);
    return { ok: true, data: updated };
  });

  app.post("/domains/:domainId/activate", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = domainParamsSchema.parse(request.params);
    const updated = await domains.activateDomain(domainId, auth.studioId!, auth.actorId);
    return { ok: true, data: updated };
  });

  app.post("/domains/:domainId/set-primary", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = domainParamsSchema.parse(request.params);
    await domains.setPrimaryDomain(domainId, auth.studioId!, auth.actorId);
    return { ok: true, data: null };
  });

  app.delete("/domains/:domainId", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = domainParamsSchema.parse(request.params);
    await domains.removeDomain(domainId, auth.studioId!, auth.actorId);
    return { ok: true, data: null };
  });

  app.get("/domains/audit-log", { preHandler: guard }, async (request) => {
    const auth = request.auth!;
    const { domainId } = auditQuerySchema.parse(request.query);
    return { ok: true, data: await domains.listDomainAuditLog(auth.studioId!, domainId) };
  });
}
