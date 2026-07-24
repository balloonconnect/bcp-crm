import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { resolveUnitPrice, validateCoupon, computeCouponDiscount, computeOrderTotals, resolveCommissionPercent, buildOrderNumber, buildLabExportCsv } from "@bcp/commerce";
import { recordActivity } from "./activity-log.service";

export class CommerceOrderNotFoundError extends Error {
  readonly code = "COMMERCE_ORDER_NOT_FOUND";
  constructor() {
    super("Order not found");
    this.name = "CommerceOrderNotFoundError";
  }
}

export class InvalidCouponError extends Error {
  readonly code = "INVALID_COUPON";
  constructor(public readonly reason: string) {
    super(`This coupon can't be applied: ${reason.replace(/_/g, " ")}.`);
    this.name = "InvalidCouponError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

async function getPlatformCommerceSettings() {
  const existing = await prisma.platformCommerceSettings.findFirst();
  return existing ?? { commissionEnabled: false, commissionPercent: 0 };
}

const orderInclude = { items: { include: { product: { select: { name: true, category: true } }, variant: true, galleryPhoto: { select: { id: true, thumbnailKey: true } } } }, payments: true };

export async function listOrders(studioId: string, filter?: { status?: string; clientId?: string }) {
  return prisma.commerceOrder.findMany({ where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}), ...(filter?.clientId ? { clientId: filter.clientId } : {}) }, orderBy: { createdAt: "desc" } });
}

export async function getOrder(studioId: string, orderId: string) {
  const order = await prisma.commerceOrder.findFirst({ where: { id: orderId, studioId }, include: orderInclude });
  if (!order) throw new CommerceOrderNotFoundError();
  return order;
}

export interface CreateOrderInput {
  clientId: string;
  eventId?: string;
  galleryId?: string;
  items: { productId: string; variantId?: string; galleryPhotoId?: string; quantity: number }[];
  couponCode?: string;
  shippingPaise?: number;
  taxRatePercent?: number;
  shippingName?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingPhone?: string;
}

/**
 * Resolves every line item's real unit price (event override → variant
 * → base, in that order — `@bcp/commerce`'s `resolveUnitPrice()`),
 * validates and applies a coupon if one was given, computes the full
 * order total including tax and shipping, and — the brief's default —
 * resolves platform commission from `PlatformCommerceSettings`, which
 * is 0 unless a platform admin has explicitly turned it on.
 */
export async function createOrder(studioId: string, input: CreateOrderInput, actorId: string) {
  const resolvedItems: { productId: string; variantId: string | undefined; galleryPhotoId: string | undefined; quantity: number; unitPricePaise: number; totalPaise: number; category: string }[] = [];
  for (const item of input.items) {
    const product = await prisma.product.findFirstOrThrow({ where: { id: item.productId, studioId } });
    const variant = item.variantId ? await prisma.productVariant.findFirst({ where: { id: item.variantId, productId: item.productId } }) : null;
    const override = input.eventId
      ? await prisma.eventProductPricing.findFirst({ where: { eventId: input.eventId, productId: item.productId, variantId: item.variantId ?? null } })
      : null;

    const unitPricePaise = resolveUnitPrice({ basePriceInPaise: product.basePriceInPaise, variantPriceInPaise: variant?.priceInPaise ?? null, eventOverridePriceInPaise: override?.overridePriceInPaise ?? null });
    resolvedItems.push({ productId: item.productId, variantId: item.variantId, galleryPhotoId: item.galleryPhotoId, quantity: item.quantity, unitPricePaise, totalPaise: unitPricePaise * item.quantity, category: product.category });
  }

  let discountPaise = 0;
  let couponId: string | undefined;
  if (input.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { studioId_code: { studioId, code: input.couponCode.toUpperCase() } } });
    if (!coupon) throw new InvalidCouponError("not_found");
    const check = validateCoupon(coupon, resolvedItems.map((i) => i.category));
    if (!check.valid) throw new InvalidCouponError(check.reason);
    const subtotal = resolvedItems.reduce((sum, i) => sum + i.totalPaise, 0);
    discountPaise = computeCouponDiscount(subtotal, coupon);
    couponId = coupon.id;
  }

  const settings = await getPlatformCommerceSettings();
  const commissionPercent = resolveCommissionPercent(settings);

  const totals = computeOrderTotals({ items: resolvedItems.map((i) => ({ unitPricePaise: i.unitPricePaise, quantity: i.quantity })), discountPaise, shippingPaise: input.shippingPaise ?? 0, taxRatePercent: input.taxRatePercent ?? 0, commissionPercent });

  const sequence = (await prisma.commerceOrder.count({ where: { studioId } })) + 1;

  const order = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.commerceOrder.create({
      data: {
        studioId, clientId: input.clientId, eventId: input.eventId, galleryId: input.galleryId,
        orderNumber: buildOrderNumber(sequence),
        subtotalPaise: totals.subtotalPaise, discountPaise: totals.discountPaise, shippingPaise: totals.shippingPaise, taxPaise: totals.taxPaise, totalPaise: totals.totalPaise,
        platformCommissionPercent: commissionPercent, platformCommissionPaise: totals.platformCommissionPaise,
        couponId,
        shippingName: input.shippingName, shippingAddressLine1: input.shippingAddressLine1, shippingAddressLine2: input.shippingAddressLine2, shippingCity: input.shippingCity, shippingState: input.shippingState, shippingPostalCode: input.shippingPostalCode, shippingPhone: input.shippingPhone,
        items: { create: resolvedItems.map((i) => ({ productId: i.productId, variantId: i.variantId, galleryPhotoId: i.galleryPhotoId, quantity: i.quantity, unitPricePaise: i.unitPricePaise, totalPaise: i.totalPaise })) },
      },
    });
    if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    return created;
  });

  await recordActivity({ studioId, actorId, action: "commerce_order.created", resourceType: "CommerceOrder", resourceId: order.id, metadata: { orderNumber: order.orderNumber, totalPaise: order.totalPaise } });
  return getOrder(studioId, order.id);
}

/** "Online payment" / "Manual payment" — both land as a `CommercePayment` row; the distinction is just the `method` value, the same way it already works for invoices. Fully paying an order (payments summing to the total) advances its status to `paid` automatically. */
export async function recordCommercePayment(studioId: string, orderId: string, input: { amountPaise: number; method: string; gatewayProvider?: string; gatewayTransactionId?: string }, actorId: string) {
  const order = await prisma.commerceOrder.findFirst({ where: { id: orderId, studioId } });
  if (!order) throw new CommerceOrderNotFoundError();

  const paymentMethod = ["razorpay", "cashfree"].includes(input.method) ? "online" : "manual";

  const payment = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.commercePayment.create({ data: { orderId, amountPaise: input.amountPaise, method: input.method as never, status: "completed", gatewayProvider: input.gatewayProvider, gatewayTransactionId: input.gatewayTransactionId, paidAt: new Date() } });

    const paidAggregate = await tx.commercePayment.aggregate({ where: { orderId, status: "completed" }, _sum: { amountPaise: true } });
    const totalPaid = paidAggregate._sum.amountPaise ?? 0;
    if (totalPaid >= order.totalPaise) await tx.commerceOrder.update({ where: { id: orderId }, data: { status: "paid", paymentMethod: paymentMethod as never } });

    return created;
  });

  await recordActivity({ studioId, actorId, action: "commerce_order.payment_recorded", resourceType: "CommerceOrder", resourceId: orderId, metadata: { amountPaise: input.amountPaise, method: input.method } });
  return payment;
}

export async function updateOrderStatus(studioId: string, orderId: string, status: string, actorId: string) {
  const order = await prisma.commerceOrder.findFirst({ where: { id: orderId, studioId } });
  if (!order) throw new CommerceOrderNotFoundError();

  await prisma.commerceOrder.update({ where: { id: orderId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "commerce_order.status_changed", resourceType: "CommerceOrder", resourceId: orderId, metadata: { status } });
  return getOrder(studioId, orderId);
}

/** "Courier" / "Fulfilment" — dispatching sets the order to `shipped` in the same step. */
export async function dispatchOrder(studioId: string, orderId: string, courierName: string, trackingNumber: string, actorId: string) {
  const order = await prisma.commerceOrder.findFirst({ where: { id: orderId, studioId } });
  if (!order) throw new CommerceOrderNotFoundError();

  await prisma.commerceOrder.update({ where: { id: orderId }, data: { courierName, trackingNumber, dispatchedAt: new Date(), status: "shipped" } });
  await recordActivity({ studioId, actorId, action: "commerce_order.dispatched", resourceType: "CommerceOrder", resourceId: orderId, metadata: { courierName, trackingNumber } });
  return getOrder(studioId, orderId);
}

export async function markOrderDelivered(studioId: string, orderId: string, actorId: string) {
  const order = await prisma.commerceOrder.findFirst({ where: { id: orderId, studioId } });
  if (!order) throw new CommerceOrderNotFoundError();

  await prisma.commerceOrder.update({ where: { id: orderId }, data: { deliveredAt: new Date(), status: "delivered" } });
  await recordActivity({ studioId, actorId, action: "commerce_order.delivered", resourceType: "CommerceOrder", resourceId: orderId });
  return getOrder(studioId, orderId);
}

/** "Lab export" + "Original download for lab fulfilment" — every photo-based item's true original resolved by storage key, never a compressed or watermarked variant a lab would print at reduced quality. */
export async function exportOrderForLab(studioId: string, orderId: string) {
  const order = await getOrder(studioId, orderId);
  const items = order.items.map((item: { id: string; product: { name: string }; variant: { size: string | null; finish: string | null } | null; quantity: number; galleryPhoto: { id: string } | null }) => ({
    orderItemId: item.id,
    productName: item.product.name,
    size: item.variant?.size ?? null,
    finish: item.variant?.finish ?? null,
    quantity: item.quantity,
    originalFileKey: null as string | null,
  }));

  const photoIds = order.items.map((i: { galleryPhoto: { id: string } | null }) => i.galleryPhoto?.id).filter((id: string | undefined): id is string => Boolean(id));
  const photos = photoIds.length > 0 ? await prisma.galleryPhoto.findMany({ where: { id: { in: photoIds } }, select: { id: true, fileKey: true } }) : [];
  const fileKeyByPhotoId = new Map(photos.map((p: { id: string; fileKey: string }) => [p.id, p.fileKey]));

  for (let i = 0; i < order.items.length; i++) {
    const photoId = order.items[i]!.galleryPhoto?.id;
    if (photoId) items[i]!.originalFileKey = fileKeyByPhotoId.get(photoId) ?? null;
  }

  const csv = buildLabExportCsv(order.orderNumber, items);
  const key = `commerce-orders/${orderId}/lab-export-${Date.now()}.csv`;
  await getStorageClient().put(key, Buffer.from(csv, "utf-8"), "text/csv");
  await prisma.commerceOrder.update({ where: { id: orderId }, data: { labExportedAt: new Date(), status: "processing" } });

  return { csv, key };
}

// ── Platform commission settings ────────────────────────────────────

export async function getPlatformSettings() {
  return getPlatformCommerceSettings();
}

export async function updatePlatformSettings(input: { commissionEnabled?: boolean; commissionPercent?: number }) {
  const existing = await prisma.platformCommerceSettings.findFirst();
  if (existing) return prisma.platformCommerceSettings.update({ where: { id: existing.id }, data: input });
  return prisma.platformCommerceSettings.create({ data: input });
}
