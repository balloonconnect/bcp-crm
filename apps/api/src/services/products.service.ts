import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND";
  constructor() {
    super("Product not found");
    this.name = "ProductNotFoundError";
  }
}

export class CouponNotFoundError extends Error {
  readonly code = "COUPON_NOT_FOUND";
  constructor() {
    super("Coupon not found");
    this.name = "CouponNotFoundError";
  }
}

// ── Products & variants ─────────────────────────────────────────────

export async function listProducts(studioId: string, category?: string) {
  return prisma.product.findMany({ where: { studioId, ...(category ? { category: category as never } : {}) }, include: { variants: true }, orderBy: { name: "asc" } });
}

export async function getProduct(studioId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, studioId }, include: { variants: true } });
  if (!product) throw new ProductNotFoundError();
  return product;
}

export async function createProduct(studioId: string, input: { category: string; name: string; description?: string; basePriceInPaise: number }, actorId: string) {
  const product = await prisma.product.create({ data: { studioId, category: input.category as never, name: input.name, description: input.description, basePriceInPaise: input.basePriceInPaise } });
  await recordActivity({ studioId, actorId, action: "product.created", resourceType: "Product", resourceId: product.id, metadata: { name: product.name } });
  return product;
}

export async function updateProduct(studioId: string, productId: string, input: Partial<{ category: string; name: string; description: string; basePriceInPaise: number; isActive: boolean }>, actorId: string) {
  await getProduct(studioId, productId);
  await prisma.product.update({ where: { id: productId }, data: { ...input, category: input.category as never } });
  await recordActivity({ studioId, actorId, action: "product.updated", resourceType: "Product", resourceId: productId });
  return getProduct(studioId, productId);
}

export async function addVariant(studioId: string, productId: string, input: { size?: string; finish?: string; quantityTier?: string; sku?: string; priceInPaise: number }, actorId: string) {
  await getProduct(studioId, productId);
  const variant = await prisma.productVariant.create({ data: { productId, ...input } });
  await recordActivity({ studioId, actorId, action: "product_variant.created", resourceType: "Product", resourceId: productId });
  return variant;
}

// ── Event-specific pricing ──────────────────────────────────────────

export async function setEventPricing(studioId: string, eventId: string, input: { productId: string; variantId?: string; overridePriceInPaise: number }, actorId: string) {
  const pricing = await prisma.eventProductPricing.upsert({
    where: { eventId_productId_variantId: { eventId, productId: input.productId, variantId: input.variantId ?? "" } },
    update: { overridePriceInPaise: input.overridePriceInPaise },
    create: { studioId, eventId, productId: input.productId, variantId: input.variantId, overridePriceInPaise: input.overridePriceInPaise },
  });
  await recordActivity({ studioId, actorId, action: "event_product_pricing.set", resourceType: "Event", resourceId: eventId, metadata: { productId: input.productId } });
  return pricing;
}

export async function listEventPricing(studioId: string, eventId: string) {
  return prisma.eventProductPricing.findMany({ where: { studioId, eventId }, include: { product: { select: { name: true } }, variant: true } });
}

// ── Coupons ──────────────────────────────────────────────────────────

export async function listCoupons(studioId: string) {
  return prisma.coupon.findMany({ where: { studioId }, orderBy: { createdAt: "desc" } });
}

export async function createCoupon(studioId: string, input: { code: string; discountType: string; discountValue: number; appliesToCategory?: string; maxUses?: number; validFrom?: string; validUntil?: string }, actorId: string) {
  const coupon = await prisma.coupon.create({
    data: { studioId, code: input.code.toUpperCase(), discountType: input.discountType as never, discountValue: input.discountValue, appliesToCategory: input.appliesToCategory as never, maxUses: input.maxUses, validFrom: input.validFrom ? new Date(input.validFrom) : undefined, validUntil: input.validUntil ? new Date(input.validUntil) : undefined },
  });
  await recordActivity({ studioId, actorId, action: "coupon.created", resourceType: "Coupon", resourceId: coupon.id, metadata: { code: coupon.code } });
  return coupon;
}

export async function getCouponByCode(studioId: string, code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { studioId_code: { studioId, code: code.toUpperCase() } } });
  if (!coupon) throw new CouponNotFoundError();
  return coupon;
}
