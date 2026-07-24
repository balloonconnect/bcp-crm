import type { FastifyInstance } from "fastify";
import { partialBrandThemeSchema } from "@bcp/branding";
import { z } from "zod";
import * as branding from "../services/branding.service";
import { requireStudioPermission } from "../plugins/auth-guard";
import { resolveStudioIdForAuth } from "../services/resolve-studio-for-auth";

const rollbackSchema = z.object({ version: z.number().int().positive() });
const branchOverrideParamsSchema = z.object({ branchId: z.string().uuid() });
const publicThemeQuerySchema = z.object({ studioSlug: z.string().optional(), branchId: z.string().uuid().optional() });
const assetUploadQuerySchema = z.object({
  kind: z.enum(["logo", "logo_light", "logo_dark", "favicon", "login_background", "email_header_image", "watermark"]),
});

export async function brandingRoutes(app: FastifyInstance) {
  // ── Authenticated management (studio CRM theme editor) ─────────────
  app.get(
    "/branding/theme",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      return { ok: true, data: await branding.getResolvedTheme(auth.studioId!) };
    },
  );

  app.patch(
    "/branding/theme",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      const updates = partialBrandThemeSchema.parse(request.body);
      const result = await branding.updateStudioBrand(auth.studioId!, updates, auth.actorId);
      return { ok: true, data: result };
    },
  );

  app.get(
    "/branding/versions",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      return { ok: true, data: await branding.listBrandVersions(auth.studioId!) };
    },
  );

  app.post(
    "/branding/versions/rollback",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      const { version } = rollbackSchema.parse(request.body);
      const result = await branding.rollbackToVersion(auth.studioId!, version, auth.actorId);
      return { ok: true, data: result };
    },
  );

  app.patch(
    "/branding/branches/:branchId",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      const { branchId } = branchOverrideParamsSchema.parse(request.params);
      const overrides = partialBrandThemeSchema.parse(request.body);
      await branding.updateBranchBrand(auth.studioId!, branchId, overrides, auth.actorId);
      return { ok: true, data: null };
    },
  );

  app.get(
    "/branding/branches/:branchId/theme",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      const { branchId } = branchOverrideParamsSchema.parse(request.params);
      return { ok: true, data: await branding.getResolvedTheme(auth.studioId!, branchId) };
    },
  );

  app.post(
    "/branding/assets",
    { preHandler: [app.authenticate, requireStudioPermission("studio:manage")] },
    async (request) => {
      const auth = request.auth!;
      const { kind } = assetUploadQuerySchema.parse(request.query);
      const file = await request.file();
      if (!file) {
        return { ok: false, error: { code: "NO_FILE", message: "No file uploaded" } };
      }
      const body = await file.toBuffer();
      const result = await branding.uploadBrandAsset({
        studioId: auth.studioId!,
        kind,
        mimeType: file.mimetype,
        sizeBytes: body.byteLength,
        body,
      });
      return { ok: true, data: result };
    },
  );

  // ── Public theme resolution (gallery, client portal, public forms) ──
  // No authentication — branding is meant to be publicly visible on these
  // surfaces. Studio is resolved from the verified hostname or an explicit
  // slug, same pre-auth resolution used by login (see
  // resolve-studio-for-auth.ts) — this is read-only, public-safe data,
  // not the tenant-isolation boundary that applies to business data.
  app.get("/public/branding", async (request, reply) => {
    const { studioSlug, branchId } = publicThemeQuerySchema.parse(request.query);
    const studioId = await resolveStudioIdForAuth({ hostname: request.hostname, studioSlug });
    if (!studioId) {
      return reply.status(404).send({ ok: false, error: { code: "STUDIO_NOT_FOUND", message: "Unknown studio" } });
    }
    const resolved = await branding.getResolvedTheme(studioId, branchId ?? null);
    return { ok: true, data: resolved.theme };
  });
}
