-- Event & calendar management (Prompt 18): full shoot-day detail on
-- Event (venue/map/contact/dress/travel/accommodation/deliverables),
-- an equipment catalog with double-booking detection support, per-event
-- service links, shot lists, and intra-day schedules. Additive on top
-- of 20260710001400.

-- ── Event: new columns ───────────────────────────────────────────────
ALTER TABLE "events"
  ADD COLUMN "end_at" TIMESTAMP(3),
  ADD COLUMN "venue" TEXT,
  ADD COLUMN "address_line1" TEXT,
  ADD COLUMN "address_city" TEXT,
  ADD COLUMN "address_state" TEXT,
  ADD COLUMN "address_postal_code" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "contact_person_name" TEXT,
  ADD COLUMN "contact_person_phone" TEXT,
  ADD COLUMN "dress_notes" TEXT,
  ADD COLUMN "travel_notes" TEXT,
  ADD COLUMN "accommodation_notes" TEXT,
  ADD COLUMN "internal_notes" TEXT,
  ADD COLUMN "deliverables" TEXT[] NOT NULL DEFAULT '{}';

-- ── Equipment ────────────────────────────────────────────────────────
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "equipment_studio_id_idx" ON "equipment"("studio_id");
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EventEquipment ───────────────────────────────────────────────────
CREATE TABLE "event_equipment" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "event_equipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_equipment_event_id_equipment_id_key" ON "event_equipment"("event_id", "equipment_id");
CREATE INDEX "event_equipment_equipment_id_idx" ON "event_equipment"("equipment_id");
ALTER TABLE "event_equipment" ADD CONSTRAINT "event_equipment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_equipment" ADD CONSTRAINT "event_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EventService ─────────────────────────────────────────────────────
CREATE TABLE "event_services" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    CONSTRAINT "event_services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_services_event_id_service_id_key" ON "event_services"("event_id", "service_id");
CREATE INDEX "event_services_service_id_idx" ON "event_services"("service_id");
ALTER TABLE "event_services" ADD CONSTRAINT "event_services_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_services" ADD CONSTRAINT "event_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EventShotListItem ────────────────────────────────────────────────
CREATE TABLE "event_shot_list_items" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "event_shot_list_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_shot_list_items_event_id_idx" ON "event_shot_list_items"("event_id");
ALTER TABLE "event_shot_list_items" ADD CONSTRAINT "event_shot_list_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EventScheduleItem ────────────────────────────────────────────────
CREATE TABLE "event_schedule_items" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "event_schedule_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_schedule_items_event_id_idx" ON "event_schedule_items"("event_id");
ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
