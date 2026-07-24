import { z } from "zod";

export const productInputSchema = z.object({
  category: z.enum(["softcopy", "print", "album", "frame", "canvas", "acrylic", "calendar", "photo_book", "gift"]),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  basePriceInPaise: z.number().int().nonnegative(),
});
export const productUpdateSchema = productInputSchema.partial();

export const productVariantInputSchema = z.object({
  size: z.string().max(50).optional(),
  finish: z.string().max(50).optional(),
  quantityTier: z.string().max(50).optional(),
  sku: z.string().max(100).optional(),
  priceInPaise: z.number().int().nonnegative(),
});

export const eventPricingInputSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), overridePriceInPaise: z.number().int().nonnegative() });

export const couponInputSchema = z.object({
  code: z.string().min(2).max(50),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().positive(),
  appliesToCategory: z.enum(["softcopy", "print", "album", "frame", "canvas", "acrylic", "calendar", "photo_book", "gift"]).optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const orderItemInputSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), galleryPhotoId: z.string().uuid().optional(), quantity: z.number().int().positive() });

export const createOrderSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  items: z.array(orderItemInputSchema).min(1).max(200),
  couponCode: z.string().optional(),
  shippingPaise: z.number().int().nonnegative().optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  shippingName: z.string().max(200).optional(),
  shippingAddressLine1: z.string().max(200).optional(),
  shippingAddressLine2: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingPostalCode: z.string().max(20).optional(),
  shippingPhone: z.string().max(20).optional(),
});

export const recordCommercePaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "razorpay", "cashfree", "other"]),
  gatewayProvider: z.string().max(50).optional(),
  gatewayTransactionId: z.string().max(200).optional(),
});

export const courierInputSchema = z.object({ courierName: z.string().min(1).max(200), trackingNumber: z.string().min(1).max(200) });

export const platformCommerceSettingsSchema = z.object({ commissionEnabled: z.boolean().optional(), commissionPercent: z.number().min(0).max(100).optional() });
