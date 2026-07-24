-- Equipment management (Prompt 21): full asset register on Equipment
-- (serial number, purchase/warranty/insurance, condition, replacement
-- cost, a printable QR token), maintenance/repair/rental history,
-- damage reports, and a short-term QR-driven checkout log distinct
-- from Prompt 20's long-term custody assignment. Additive on top of
-- 20260710001700.

CREATE TYPE "EquipmentCondition" AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');
CREATE TYPE "EquipmentStatus" AS ENUM ('available', 'checked_out', 'in_maintenance', 'in_repair', 'retired');
CREATE TYPE "MaintenanceType" AS ENUM ('routine', 'cleaning', 'calibration', 'firmware_update', 'other');
CREATE TYPE "RepairStatus" AS ENUM ('reported', 'in_repair', 'resolved', 'unrepairable');
CREATE TYPE "RentalDirection" AS ENUM ('rented_out', 'rented_in');
CREATE TYPE "DamageSeverity" AS ENUM ('minor', 'moderate', 'severe', 'total_loss');

-- ── Equipment: new columns ───────────────────────────────────────────
ALTER TABLE "equipment"
  ADD COLUMN "serial_number" TEXT,
  ADD COLUMN "purchase_date" TIMESTAMP(3),
  ADD COLUMN "purchase_price" INTEGER,
  ADD COLUMN "replacement_cost" INTEGER,
  ADD COLUMN "warranty_expires_at" TIMESTAMP(3),
  ADD COLUMN "insurance_policy_number" TEXT,
  ADD COLUMN "insurance_expires_at" TIMESTAMP(3),
  ADD COLUMN "condition" "EquipmentCondition" NOT NULL DEFAULT 'good',
  ADD COLUMN "current_status" "EquipmentStatus" NOT NULL DEFAULT 'available',
  ADD COLUMN "qr_code_token" TEXT;

-- Backfill a qr_code_token for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "equipment" SET "qr_code_token" = gen_random_uuid()::text WHERE "qr_code_token" IS NULL;
ALTER TABLE "equipment" ALTER COLUMN "qr_code_token" SET NOT NULL;
CREATE UNIQUE INDEX "equipment_qr_code_token_key" ON "equipment"("qr_code_token");

-- ── EquipmentMaintenanceRecord ───────────────────────────────────────
CREATE TABLE "equipment_maintenance_records" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "maintenance_type" "MaintenanceType" NOT NULL DEFAULT 'routine',
    "performed_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "cost" INTEGER,
    "performed_by" TEXT,
    "next_due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "equipment_maintenance_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_maintenance_records_equipment_id_idx" ON "equipment_maintenance_records"("equipment_id");
CREATE INDEX "equipment_maintenance_records_studio_id_idx" ON "equipment_maintenance_records"("studio_id");
ALTER TABLE "equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EquipmentRepairRecord ────────────────────────────────────────────
CREATE TABLE "equipment_repair_records" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'reported',
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue_description" TEXT NOT NULL,
    "vendor" TEXT,
    "cost" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "equipment_repair_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_repair_records_equipment_id_idx" ON "equipment_repair_records"("equipment_id");
CREATE INDEX "equipment_repair_records_studio_id_idx" ON "equipment_repair_records"("studio_id");
ALTER TABLE "equipment_repair_records" ADD CONSTRAINT "equipment_repair_records_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_repair_records" ADD CONSTRAINT "equipment_repair_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EquipmentRentalRecord ────────────────────────────────────────────
CREATE TABLE "equipment_rental_records" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "direction" "RentalDirection" NOT NULL,
    "counterparty_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "cost" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "equipment_rental_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_rental_records_equipment_id_idx" ON "equipment_rental_records"("equipment_id");
CREATE INDEX "equipment_rental_records_studio_id_idx" ON "equipment_rental_records"("studio_id");
ALTER TABLE "equipment_rental_records" ADD CONSTRAINT "equipment_rental_records_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_rental_records" ADD CONSTRAINT "equipment_rental_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EquipmentDamageReport ────────────────────────────────────────────
CREATE TABLE "equipment_damage_reports" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "severity" "DamageSeverity" NOT NULL DEFAULT 'minor',
    "description" TEXT NOT NULL,
    "reported_by" UUID,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo_keys" TEXT[] NOT NULL DEFAULT '{}',
    "repair_cost" INTEGER,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "equipment_damage_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_damage_reports_equipment_id_idx" ON "equipment_damage_reports"("equipment_id");
CREATE INDEX "equipment_damage_reports_studio_id_idx" ON "equipment_damage_reports"("studio_id");
ALTER TABLE "equipment_damage_reports" ADD CONSTRAINT "equipment_damage_reports_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_damage_reports" ADD CONSTRAINT "equipment_damage_reports_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EquipmentCheckoutRecord ──────────────────────────────────────────
CREATE TABLE "equipment_checkout_records" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID,
    "checked_out_by_user_id" UUID NOT NULL,
    "checked_out_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "condition_at_checkout" "EquipmentCondition",
    "condition_at_checkin" "EquipmentCondition",
    "notes" TEXT,
    CONSTRAINT "equipment_checkout_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_checkout_records_equipment_id_idx" ON "equipment_checkout_records"("equipment_id");
CREATE INDEX "equipment_checkout_records_studio_id_idx" ON "equipment_checkout_records"("studio_id");
CREATE INDEX "equipment_checkout_records_equipment_id_checked_in_at_idx" ON "equipment_checkout_records"("equipment_id", "checked_in_at");
ALTER TABLE "equipment_checkout_records" ADD CONSTRAINT "equipment_checkout_records_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_checkout_records" ADD CONSTRAINT "equipment_checkout_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_checkout_records" ADD CONSTRAINT "equipment_checkout_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_checkout_records" ADD CONSTRAINT "equipment_checkout_records_checked_out_by_user_id_fkey" FOREIGN KEY ("checked_out_by_user_id") REFERENCES "studio_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
