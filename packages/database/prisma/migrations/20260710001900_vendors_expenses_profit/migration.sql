-- Vendors, expenses & profit (Prompt 22): a vendor register, cost
-- centres, minimal single-line purchase orders, vendor bills (the
-- payable-side mirror of Invoice), and a full expansion of Expense
-- (event/booking linkage, receipts, approval, recurring, GST/TDS,
-- payment status). Additive on top of 20260710001800.

CREATE TYPE "ExpenseApprovalStatus" AS ENUM ('not_required', 'pending', 'approved', 'rejected');
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('unpaid', 'partially_paid', 'paid');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent', 'fulfilled', 'cancelled');
CREATE TYPE "VendorBillStatus" AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue');

-- ── Vendor ───────────────────────────────────────────────────────────
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "contact_person_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "payment_terms" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendors_studio_id_idx" ON "vendors"("studio_id");
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CostCentre ───────────────────────────────────────────────────────
CREATE TABLE "cost_centres" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_centres_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cost_centres_studio_id_idx" ON "cost_centres"("studio_id");
ALTER TABLE "cost_centres" ADD CONSTRAINT "cost_centres_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PurchaseOrder ────────────────────────────────────────────────────
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "vendor_id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "expected_delivery_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_studio_id_po_number_key" ON "purchase_orders"("studio_id", "po_number");
CREATE INDEX "purchase_orders_studio_id_idx" ON "purchase_orders"("studio_id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── VendorBill ───────────────────────────────────────────────────────
CREATE TABLE "vendor_bills" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "purchase_order_id" UUID,
    "bill_number" TEXT NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "gst_amount" INTEGER NOT NULL DEFAULT 0,
    "tds_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "status" "VendorBillStatus" NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_bills_studio_id_idx" ON "vendor_bills"("studio_id");
CREATE INDEX "vendor_bills_studio_id_status_idx" ON "vendor_bills"("studio_id", "status");
CREATE INDEX "vendor_bills_vendor_id_idx" ON "vendor_bills"("vendor_id");
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Expense: new columns ─────────────────────────────────────────────
ALTER TABLE "expenses"
  ADD COLUMN "event_id" UUID,
  ADD COLUMN "booking_id" UUID,
  ADD COLUMN "vendor_id" UUID,
  ADD COLUMN "cost_centre_id" UUID,
  ADD COLUMN "purchase_order_id" UUID,
  ADD COLUMN "vendor_bill_id" UUID,
  ADD COLUMN "gst_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tds_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "receipt_file_key" TEXT,
  ADD COLUMN "approval_status" "ExpenseApprovalStatus" NOT NULL DEFAULT 'not_required',
  ADD COLUMN "approved_by_user_id" UUID,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "payment_status" "ExpensePaymentStatus" NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recurrence_frequency" "RecurrenceFrequency",
  ADD COLUMN "recurrence_interval" INTEGER,
  ADD COLUMN "next_occurrence_at" TIMESTAMP(3);

CREATE INDEX "expenses_studio_id_event_id_idx" ON "expenses"("studio_id", "event_id");
CREATE INDEX "expenses_studio_id_approval_status_idx" ON "expenses"("studio_id", "approval_status");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cost_centre_id_fkey" FOREIGN KEY ("cost_centre_id") REFERENCES "cost_centres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "vendor_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
