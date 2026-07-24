-- Services & packages catalog (Prompt 15): sellable services, bundled
-- packages with their own customer-facing pricing independent of
-- summed internal service costs, add-ons, and payment schedules.
-- Additive on top of 20260710001100.

CREATE TYPE "ServiceCategory" AS ENUM ('photography', 'videography', 'aerial_and_specialty', 'streaming_and_display', 'print_and_album', 'post_production', 'logistics', 'styling');
CREATE TYPE "ServiceUnit" AS ENUM ('per_event', 'per_hour', 'per_day', 'per_item');
CREATE TYPE "PaymentScheduleTrigger" AS ENUM ('on_booking', 'before_event', 'on_event_day', 'on_delivery', 'custom_days_before_event', 'custom_days_after_event');

CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description" TEXT,
    "internal_price" INTEGER NOT NULL,
    "unit" "ServiceUnit" NOT NULL DEFAULT 'per_event',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "services_studio_id_idx" ON "services"("studio_id");
CREATE INDEX "services_studio_id_category_idx" ON "services"("studio_id", "category");
ALTER TABLE "services" ADD CONSTRAINT "services_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT,
    "customer_facing_total" INTEGER NOT NULL,
    "item_level_pricing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "duration_label" TEXT,
    "team_requirement" TEXT,
    "deliverables" TEXT[] NOT NULL,
    "tax_rate_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "discount_allowed" BOOLEAN NOT NULL DEFAULT false,
    "max_discount_percent" DOUBLE PRECISION,
    "terms_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "packages_studio_id_idx" ON "packages"("studio_id");
CREATE INDEX "packages_studio_id_event_type_idx" ON "packages"("studio_id", "event_type");
ALTER TABLE "packages" ADD CONSTRAINT "packages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "package_services" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "internal_price_snapshot" INTEGER NOT NULL,
    CONSTRAINT "package_services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "package_services_package_id_service_id_key" ON "package_services"("package_id", "service_id");
CREATE INDEX "package_services_service_id_idx" ON "package_services"("service_id");
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "package_add_ons" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    CONSTRAINT "package_add_ons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "package_add_ons_package_id_idx" ON "package_add_ons"("package_id");
ALTER TABLE "package_add_ons" ADD CONSTRAINT "package_add_ons_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "package_payment_schedule_items" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "trigger" "PaymentScheduleTrigger" NOT NULL DEFAULT 'on_booking',
    "custom_days" INTEGER,
    "order" INTEGER NOT NULL,
    CONSTRAINT "package_payment_schedule_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "package_payment_schedule_items_package_id_idx" ON "package_payment_schedule_items"("package_id");
ALTER TABLE "package_payment_schedule_items" ADD CONSTRAINT "package_payment_schedule_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
