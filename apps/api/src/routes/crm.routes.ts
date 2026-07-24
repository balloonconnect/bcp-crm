import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as reminders from "../services/reminders.service";

const reminderSchema = z.object({
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

export async function crmRoutes(app: FastifyInstance) {
  // ── Reminders ────────────────────────────────────────────────────────
  app.post("/reminders", { preHandler: [app.authenticate] }, async (request) => {
    const body = reminderSchema.parse(request.body);
    return { ok: true, data: await reminders.sendReminder({ ...body, studioId: request.auth!.studioId!, actorId: request.auth!.actorId }) };
  });
}
