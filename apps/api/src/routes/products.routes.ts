import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { productInputSchema, productUpdateSchema, productVariantInputSchema, eventPricingInputSchema, couponInputSchema } from "@bcp/commerce";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as products from "../services/products.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function productsRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("service:manage")];
  const view = [app.authenticate, requireStudioPermission("service:view")];

  app.get("/products", { preHandler: view }, async (request) => {
    const { category } = z.object({ category: z.string().optional() }).parse(request.query);
    return { ok: true, data: await products.listProducts(request.auth!.studioId!, category) };
  });

  app.get("/products/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await products.getProduct(request.auth!.studioId!, id) };
  });

  app.post("/products", { preHandler: manage }, async (request) => {
    const body = productInputSchema.parse(request.body);
    return { ok: true, data: await products.createProduct(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/products/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = productUpdateSchema.parse(request.body);
    return { ok: true, data: await products.updateProduct(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.post("/products/:id/variants", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = productVariantInputSchema.parse(request.body);
    return { ok: true, data: await products.addVariant(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/events/:eventId/product-pricing", { preHandler: view }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    return { ok: true, data: await products.listEventPricing(request.auth!.studioId!, eventId) };
  });

  app.post("/events/:eventId/product-pricing", { preHandler: manage }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    const body = eventPricingInputSchema.parse(request.body);
    return { ok: true, data: await products.setEventPricing(request.auth!.studioId!, eventId, body, request.auth!.actorId) };
  });

  app.get("/coupons", { preHandler: view }, async (request) => ({ ok: true, data: await products.listCoupons(request.auth!.studioId!) }));

  app.post("/coupons", { preHandler: manage }, async (request) => {
    const body = couponInputSchema.parse(request.body);
    return { ok: true, data: await products.createCoupon(request.auth!.studioId!, body, request.auth!.actorId) };
  });
}
