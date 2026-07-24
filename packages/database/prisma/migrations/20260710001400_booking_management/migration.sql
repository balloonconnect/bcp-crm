-- Booking management (Prompt 17): converts an accepted quotation into a
-- booking — the parent record for one or more Events, with its own
-- payment schedule, team assignment, line items, and an 11-stage
-- pipeline distinct from any single Event's status. Additive on top of
-- 20260710001300.

CREATE TYPE "BookingStatus" AS ENUM ('draft', 'awaiting_advance', 'confirmed', 'in_progress', 'editing', 'client_selection', 'album_design', 'printing', 'delivery', 'completed', 'cancelled');
CREATE TYPE "BookingPaymentMilestoneStatus" AS ENUM ('pending', 'paid', 'overdue');

CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "booking_number" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "package_id" UUID,
    "quotation_id" UUID,
    "contract_id" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'draft',
    "deliverables" TEXT[] NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "internal_cost" INTEGER NOT NULL DEFAULT 0,
    "selling_price" INTEGER NOT NULL DEFAULT 0,
    "estimated_profit" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookings_studio_id_booking_number_key" ON "bookings"("studio_id", "booking_number");
CREATE UNIQUE INDEX "bookings_quotation_id_key" ON "bookings"("quotation_id");
CREATE INDEX "bookings_studio_id_idx" ON "bookings"("studio_id");
CREATE INDEX "bookings_studio_id_status_idx" ON "bookings"("studio_id", "status");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "client_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Event: gains an optional bookingId ───────────────────────────────
ALTER TABLE "events" ADD COLUMN "booking_id" UUID;
CREATE INDEX "events_booking_id_idx" ON "events"("booking_id");
ALTER TABLE "events" ADD CONSTRAINT "events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── BookingLineItem ──────────────────────────────────────────────────
CREATE TABLE "booking_line_items" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "internal_price" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "booking_line_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_line_items_booking_id_idx" ON "booking_line_items"("booking_id");
ALTER TABLE "booking_line_items" ADD CONSTRAINT "booking_line_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── BookingTeamAssignment ────────────────────────────────────────────
CREATE TABLE "booking_team_assignments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_team_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "booking_team_assignments_booking_id_studio_user_id_key" ON "booking_team_assignments"("booking_id", "studio_user_id");
CREATE INDEX "booking_team_assignments_studio_user_id_idx" ON "booking_team_assignments"("studio_user_id");
ALTER TABLE "booking_team_assignments" ADD CONSTRAINT "booking_team_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_team_assignments" ADD CONSTRAINT "booking_team_assignments_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── BookingPaymentScheduleItem ───────────────────────────────────────
CREATE TABLE "booking_payment_schedule_items" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "BookingPaymentMilestoneStatus" NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "booking_payment_schedule_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_payment_schedule_items_booking_id_idx" ON "booking_payment_schedule_items"("booking_id");
ALTER TABLE "booking_payment_schedule_items" ADD CONSTRAINT "booking_payment_schedule_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
