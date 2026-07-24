-- Studio CRM v1 (Prompt 11): minimal models backing the studio dashboard's
-- 19 widgets and 8 quick actions — leads, events/shoots, quotations,
-- invoices, client payments, gallery/album pipeline status, expenses, and
-- per-user dashboard layout preferences. Additive on top of
-- 20260710000700_onboarding.

CREATE TYPE "LeadSource" AS ENUM ('website', 'referral', 'instagram', 'whatsapp', 'walk_in', 'other');
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'quoted', 'converted', 'lost');
CREATE TYPE "EventStatus" AS ENUM ('enquiry', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "EditingStatus" AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE "InvoiceStatus" AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'upi', 'bank_transfer', 'card', 'other');
CREATE TYPE "GalleryStatus" AS ENUM ('pending_upload', 'uploaded', 'delivered');
CREATE TYPE "AlbumStatus" AS ENUM ('pending_selection', 'selection_in_progress', 'design_pending', 'printing', 'completed');
CREATE TYPE "ExpenseCategory" AS ENUM ('equipment', 'rent', 'salaries', 'marketing', 'travel', 'printing', 'other');

CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'other',
    "event_type" TEXT,
    "event_date" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "follow_up_at" TIMESTAMP(3),
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leads_studio_id_idx" ON "leads"("studio_id");
CREATE INDEX "leads_studio_id_status_idx" ON "leads"("studio_id", "status");
CREATE INDEX "leads_studio_id_follow_up_at_idx" ON "leads"("studio_id", "follow_up_at");
ALTER TABLE "leads" ADD CONSTRAINT "leads_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "client_id" UUID,
    "lead_id" UUID,
    "title" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'enquiry',
    "editing_status" "EditingStatus" NOT NULL DEFAULT 'not_started',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "events_studio_id_idx" ON "events"("studio_id");
CREATE INDEX "events_studio_id_status_idx" ON "events"("studio_id", "status");
CREATE INDEX "events_studio_id_scheduled_at_idx" ON "events"("studio_id", "scheduled_at");
CREATE INDEX "events_studio_id_editing_status_idx" ON "events"("studio_id", "editing_status");
ALTER TABLE "events" ADD CONSTRAINT "events_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "event_assignments" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_assignments_event_id_studio_user_id_key" ON "event_assignments"("event_id", "studio_user_id");
CREATE INDEX "event_assignments_studio_user_id_idx" ON "event_assignments"("studio_user_id");
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "client_id" UUID,
    "lead_id" UUID,
    "event_id" UUID,
    "quotation_number" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "subtotal" INTEGER NOT NULL,
    "gst_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quotations_studio_id_quotation_number_key" ON "quotations"("studio_id", "quotation_number");
CREATE INDEX "quotations_studio_id_idx" ON "quotations"("studio_id");
CREATE INDEX "quotations_studio_id_status_idx" ON "quotations"("studio_id", "status");
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "client_id" UUID,
    "event_id" UUID,
    "quotation_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "subtotal" INTEGER NOT NULL,
    "gst_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoices_studio_id_invoice_number_key" ON "invoices"("studio_id", "invoice_number");
CREATE INDEX "invoices_studio_id_idx" ON "invoices"("studio_id");
CREATE INDEX "invoices_studio_id_status_idx" ON "invoices"("studio_id", "status");
CREATE INDEX "invoices_studio_id_due_date_idx" ON "invoices"("studio_id", "due_date");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "client_payments" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'other',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_payments_studio_id_idx" ON "client_payments"("studio_id");
CREATE INDEX "client_payments_invoice_id_idx" ON "client_payments"("invoice_id");
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "galleries" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "GalleryStatus" NOT NULL DEFAULT 'pending_upload',
    "photo_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "galleries_studio_id_idx" ON "galleries"("studio_id");
CREATE INDEX "galleries_studio_id_status_idx" ON "galleries"("studio_id", "status");
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "albums" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "AlbumStatus" NOT NULL DEFAULT 'pending_selection',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "albums_studio_id_idx" ON "albums"("studio_id");
CREATE INDEX "albums_studio_id_status_idx" ON "albums"("studio_id", "status");
ALTER TABLE "albums" ADD CONSTRAINT "albums_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "albums" ADD CONSTRAINT "albums_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "incurred_on" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expenses_studio_id_idx" ON "expenses"("studio_id");
CREATE INDEX "expenses_studio_id_incurred_on_idx" ON "expenses"("studio_id", "incurred_on");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dashboard_preferences" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dashboard_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dashboard_preferences_studio_user_id_key" ON "dashboard_preferences"("studio_user_id");
CREATE INDEX "dashboard_preferences_studio_id_idx" ON "dashboard_preferences"("studio_id");
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
