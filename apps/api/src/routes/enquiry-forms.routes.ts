import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enquiryFormConfigSchema } from "@bcp/enquiry-form";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as enquiryForms from "../services/enquiry-forms.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function enquiryFormsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("enquiry_form:view")];
  const manage = [app.authenticate, requireStudioPermission("enquiry_form:manage")];

  app.get("/enquiry-forms", { preHandler: view }, async (request) => ({
    ok: true,
    data: await enquiryForms.listEnquiryForms(request.auth!.studioId!),
  }));

  app.get("/enquiry-forms/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await enquiryForms.getEnquiryForm(request.auth!.studioId!, id) };
  });

  app.get("/enquiry-forms/:id/share", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await enquiryForms.getShareAssets(request.auth!.studioId!, id) };
  });

  app.post("/enquiry-forms", { preHandler: manage }, async (request) => {
    const body = enquiryFormConfigSchema.parse(request.body);
    return { ok: true, data: await enquiryForms.createEnquiryForm(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/enquiry-forms/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = enquiryFormConfigSchema.partial().parse(request.body);
    return { ok: true, data: await enquiryForms.updateEnquiryForm(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });
}
