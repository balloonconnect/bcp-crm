-- Print products & commerce (Prompt 35): a full product catalog
-- (softcopies through gift products) with size/finish/quantity
-- variants, event-specific pricing overrides, studio-owned coupons,
-- commerce orders with shipping/courier/tax and online/manual payment,
-- lab export/fulfilment, and a platform-wide commission setting
-- defaulting to zero but configurable for future use. Additive on top
-- of 20260710003100.

CREATE TYPE "ProductCategory" AS ENUM ('softcopy', 'print', 'album', 'frame', 'canvas', 'acrylic', 'calendar', 'photo_book', 'gift');
CREATE TYPE "CouponDiscountType" AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE "CommerceOrderStatus" AS ENUM ('pending', 'paid', 'processing', 'fulfilled', 'shipped', 'delivered', 'cancelled');
CREATE TYPE "CommercePaymentMethod" AS ENUM ('online', 'manual');
CREATE TYPE "CommercePaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ── Product ──────────────────────────────────────────────────────────
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price_in_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "products_studio_id_idx" ON "products"("studio_id");
CREATE INDEX "products_studio_id_category_idx" ON "products"("studio_id", "category");
ALTER TABLE "products" ADD CONSTRAINT "products_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ProductVariant ───────────────────────────────────────────────────
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "size" TEXT,
    "finish" TEXT,
    "quantity_tier" TEXT,
    "sku" TEXT,
    "price_in_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EventProductPricing ──────────────────────────────────────────────
CREATE TABLE "event_product_pricing" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "override_price_in_paise" INTEGER NOT NULL,
    CONSTRAINT "event_product_pricing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_product_pricing_event_id_product_id_variant_id_key" ON "event_product_pricing"("event_id", "product_id", "variant_id");
CREATE INDEX "event_product_pricing_studio_id_idx" ON "event_product_pricing"("studio_id");
CREATE INDEX "event_product_pricing_event_id_idx" ON "event_product_pricing"("event_id");
ALTER TABLE "event_product_pricing" ADD CONSTRAINT "event_product_pricing_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_product_pricing" ADD CONSTRAINT "event_product_pricing_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_product_pricing" ADD CONSTRAINT "event_product_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_product_pricing" ADD CONSTRAINT "event_product_pricing_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Coupon ───────────────────────────────────────────────────────────
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" DOUBLE PRECISION NOT NULL,
    "applies_to_category" "ProductCategory",
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupons_studio_id_code_key" ON "coupons"("studio_id", "code");
CREATE INDEX "coupons_studio_id_idx" ON "coupons"("studio_id");
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CommerceOrder ────────────────────────────────────────────────────
CREATE TABLE "commerce_orders" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "event_id" UUID,
    "gallery_id" UUID,
    "order_number" TEXT NOT NULL,
    "status" "CommerceOrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "shipping_paise" INTEGER NOT NULL DEFAULT 0,
    "tax_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "platform_commission_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform_commission_paise" INTEGER NOT NULL DEFAULT 0,
    "coupon_id" UUID,
    "shipping_name" TEXT,
    "shipping_address_line1" TEXT,
    "shipping_address_line2" TEXT,
    "shipping_city" TEXT,
    "shipping_state" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_phone" TEXT,
    "courier_name" TEXT,
    "tracking_number" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "payment_method" "CommercePaymentMethod",
    "lab_exported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "commerce_orders_studio_id_order_number_key" ON "commerce_orders"("studio_id", "order_number");
CREATE INDEX "commerce_orders_studio_id_idx" ON "commerce_orders"("studio_id");
CREATE INDEX "commerce_orders_client_id_idx" ON "commerce_orders"("client_id");
CREATE INDEX "commerce_orders_studio_id_status_idx" ON "commerce_orders"("studio_id", "status");
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CommerceOrderItem ────────────────────────────────────────────────
CREATE TABLE "commerce_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "gallery_photo_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_paise" INTEGER NOT NULL,
    "total_paise" INTEGER NOT NULL,
    CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "commerce_order_items_order_id_idx" ON "commerce_order_items"("order_id");
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CommercePayment ──────────────────────────────────────────────────
CREATE TABLE "commerce_payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "CommercePaymentStatus" NOT NULL DEFAULT 'pending',
    "gateway_provider" TEXT,
    "gateway_transaction_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commerce_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "commerce_payments_order_id_idx" ON "commerce_payments"("order_id");
ALTER TABLE "commerce_payments" ADD CONSTRAINT "commerce_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PlatformCommerceSettings ─────────────────────────────────────────
CREATE TABLE "platform_commerce_settings" (
    "id" UUID NOT NULL,
    "commission_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_commerce_settings_pkey" PRIMARY KEY ("id")
);
