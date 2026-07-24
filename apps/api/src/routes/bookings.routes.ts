import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { bookingUpdateSchema, bookingStatusChangeSchema, teamAssignmentSchema, paymentMilestoneUpdateSchema } from "@bcp/bookings";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as bookings from "../services/bookings.service";
import * as bookingTimeline from "../services/booking-timeline.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const subIdParamsSchema = z.object({ id: z.string().uuid(), subId: z.string().uuid() });

export async function bookingsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("booking:view")];
  const manage = [app.authenticate, requireStudioPermission("booking:manage")];

  app.get("/bookings", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), clientId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await bookings.listBookings(request.auth!.studioId!, query) };
  });

  app.get("/bookings/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await bookings.getBooking(request.auth!.studioId!, id) };
  });

  app.get("/bookings/:id/timeline", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await bookingTimeline.getBookingTimeline(request.auth!.studioId!, id) };
  });

  app.get("/bookings/by-quotation/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await bookings.getBookingByQuotationId(request.auth!.studioId!, id) };
  });

  app.patch("/bookings/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = bookingUpdateSchema.parse(request.body);
    return { ok: true, data: await bookings.updateBooking(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/bookings/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = bookingStatusChangeSchema.parse(request.body);
    return { ok: true, data: await bookings.changeBookingStatus(request.auth!.studioId!, id, status as never, request.auth!.actorId) };
  });

  app.post("/bookings/:id/recompute-cost", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await bookings.recomputeBookingCost(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/bookings/:id/team", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = teamAssignmentSchema.parse(request.body);
    return { ok: true, data: await bookings.assignTeamMember(request.auth!.studioId!, id, body.studioUserId, body.role, request.auth!.actorId) };
  });

  app.delete("/bookings/:id/team/:subId", { preHandler: manage }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    return { ok: true, data: await bookings.removeTeamMember(request.auth!.studioId!, id, subId, request.auth!.actorId) };
  });

  app.patch("/bookings/:id/payment-schedule/:subId", { preHandler: manage }, async (request) => {
    const { id, subId } = subIdParamsSchema.parse(request.params);
    const { status } = paymentMilestoneUpdateSchema.parse(request.body);
    return { ok: true, data: await bookings.updatePaymentMilestone(request.auth!.studioId!, id, subId, status, request.auth!.actorId) };
  });
}
