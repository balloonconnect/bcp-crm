-- Client CRM (Prompt 14): expands the Prompt 9 minimal Client into a
-- full profile, plus family contacts, client-scoped communication log,
-- contracts, print orders, deliveries, and feedback. Additive on top of
-- 20260710001000.

CREATE TYPE "ContractStatus" AS ENUM ('draft', 'sent', 'signed', 'void');
CREATE TYPE "PrintOrderStatus" AS ENUM ('queued', 'printing', 'quality_check', 'ready', 'shipped', 'completed');
CREATE TYPE "DeliveryMethod" AS ENUM ('digital_download', 'courier', 'pickup', 'hand_delivered');
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'in_transit', 'delivered', 'failed');

-- ── Client: new columns ──────────────────────────────────────────────
ALTER TABLE "clients"
  ADD COLUMN "bride_name" TEXT,
  ADD COLUMN "groom_name" TEXT,
  ADD COLUMN "instagram_profile_1" TEXT,
  ADD COLUMN "instagram_profile_2" TEXT,
  ADD COLUMN "facebook_profile" TEXT,
  ADD COLUMN "billing_address_line1" TEXT,
  ADD COLUMN "billing_address_line2" TEXT,
  ADD COLUMN "billing_city" TEXT,
  ADD COLUMN "billing_state" TEXT,
  ADD COLUMN "billing_postal_code" TEXT,
  ADD COLUMN "billing_country" TEXT DEFAULT 'IN',
  ADD COLUMN "shipping_same_as_billing" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "shipping_address_line1" TEXT,
  ADD COLUMN "shipping_address_line2" TEXT,
  ADD COLUMN "shipping_city" TEXT,
  ADD COLUMN "shipping_state" TEXT,
  ADD COLUMN "shipping_postal_code" TEXT,
  ADD COLUMN "shipping_country" TEXT,
  ADD COLUMN "gstin" TEXT,
  ADD COLUMN "gst_legal_name" TEXT,
  ADD COLUMN "anniversary_date" TIMESTAMP(3),
  ADD COLUMN "bride_birthday" TIMESTAMP(3),
  ADD COLUMN "groom_birthday" TIMESTAMP(3),
  ADD COLUMN "other_important_dates" JSONB,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "referred_by_id" UUID,
  ADD COLUMN "referral_notes" TEXT,
  ADD COLUMN "portal_access_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "portal_invite_token" TEXT,
  ADD COLUMN "portal_invited_at" TIMESTAMP(3),
  ADD COLUMN "portal_last_login_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "clients_portal_invite_token_key" ON "clients"("portal_invite_token");
ALTER TABLE "clients" ADD CONSTRAINT "clients_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ClientFamilyContact ──────────────────────────────────────────────
CREATE TABLE "client_family_contacts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_family_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_family_contacts_client_id_idx" ON "client_family_contacts"("client_id");
CREATE INDEX "client_family_contacts_studio_id_idx" ON "client_family_contacts"("studio_id");
ALTER TABLE "client_family_contacts" ADD CONSTRAINT "client_family_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_family_contacts" ADD CONSTRAINT "client_family_contacts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientCommunication ──────────────────────────────────────────────
CREATE TABLE "client_communications" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "client_communications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_communications_client_id_idx" ON "client_communications"("client_id");
CREATE INDEX "client_communications_studio_id_idx" ON "client_communications"("studio_id");
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientContract ───────────────────────────────────────────────────
CREATE TABLE "client_contracts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "file_key" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "client_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_contracts_client_id_idx" ON "client_contracts"("client_id");
CREATE INDEX "client_contracts_studio_id_idx" ON "client_contracts"("studio_id");
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── PrintOrder ───────────────────────────────────────────────────────
CREATE TABLE "print_orders" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "status" "PrintOrderStatus" NOT NULL DEFAULT 'queued',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "print_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "print_orders_studio_id_idx" ON "print_orders"("studio_id");
CREATE INDEX "print_orders_album_id_idx" ON "print_orders"("album_id");
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_orders" ADD CONSTRAINT "print_orders_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Delivery ─────────────────────────────────────────────────────────
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "method" "DeliveryMethod" NOT NULL DEFAULT 'digital_download',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "tracking_info" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "deliveries_studio_id_idx" ON "deliveries"("studio_id");
CREATE INDEX "deliveries_event_id_idx" ON "deliveries"("event_id");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientFeedback ───────────────────────────────────────────────────
CREATE TABLE "client_feedback" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_feedback_client_id_idx" ON "client_feedback"("client_id");
CREATE INDEX "client_feedback_studio_id_idx" ON "client_feedback"("studio_id");
ALTER TABLE "client_feedback" ADD CONSTRAINT "client_feedback_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_feedback" ADD CONSTRAINT "client_feedback_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_feedback" ADD CONSTRAINT "client_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
