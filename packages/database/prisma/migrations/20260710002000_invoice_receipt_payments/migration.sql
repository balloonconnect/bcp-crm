-- Invoice, receipt & payments (Prompt 23): full billing document
-- expansion — document type (proforma/tax/non-GST), branch + financial-
-- year numbering, CGST/SGST/IGST split, discount, installments, plus
-- three new document models (Receipt — auto-created per payment,
-- CreditNote, RefundReceipt) and two new payment methods/gateway
-- reference fields. Additive on top of 20260710001900.

ALTER TYPE "PaymentMethod" ADD VALUE 'cheque';
ALTER TYPE "PaymentMethod" ADD VALUE 'razorpay';
ALTER TYPE "PaymentMethod" ADD VALUE 'cashfree';

CREATE TYPE "InvoiceDocumentType" AS ENUM ('proforma_invoice', 'tax_invoice', 'non_gst_invoice');
CREATE TYPE "InvoiceDiscountType" AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE "InstallmentStatus" AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE "CreditNoteStatus" AS ENUM ('issued', 'applied', 'cancelled');

-- ── Invoice: new columns ─────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD COLUMN "branch_id" UUID,
  ADD COLUMN "document_type" "InvoiceDocumentType" NOT NULL DEFAULT 'tax_invoice',
  ADD COLUMN "financial_year" TEXT,
  ADD COLUMN "discount_type" "InvoiceDiscountType",
  ADD COLUMN "discount_value" DOUBLE PRECISION,
  ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_inter_state" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gst_rate_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "cgst_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sgst_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "igst_amount" INTEGER NOT NULL DEFAULT 0;

-- Backfill financial_year for any pre-existing rows (derived from created_at, Indian FY = Apr-Mar) before enforcing NOT NULL.
UPDATE "invoices" SET "financial_year" =
  CASE WHEN EXTRACT(MONTH FROM "created_at") >= 4
    THEN EXTRACT(YEAR FROM "created_at")::text || '-' || RIGHT((EXTRACT(YEAR FROM "created_at") + 1)::text, 2)
    ELSE (EXTRACT(YEAR FROM "created_at") - 1)::text || '-' || RIGHT(EXTRACT(YEAR FROM "created_at")::text, 2)
  END
  WHERE "financial_year" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "financial_year" SET NOT NULL;

-- ── ClientPayment: new columns ───────────────────────────────────────
ALTER TABLE "client_payments"
  ADD COLUMN "gateway_provider" TEXT,
  ADD COLUMN "gateway_transaction_id" TEXT;

-- ── InvoiceInstallment ───────────────────────────────────────────────
CREATE TABLE "invoice_installments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "invoice_installments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "invoice_installments_invoice_id_idx" ON "invoice_installments"("invoice_id");
ALTER TABLE "invoice_installments" ADD CONSTRAINT "invoice_installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Receipt ──────────────────────────────────────────────────────────
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");
CREATE UNIQUE INDEX "receipts_studio_id_receipt_number_key" ON "receipts"("studio_id", "receipt_number");
CREATE INDEX "receipts_studio_id_idx" ON "receipts"("studio_id");
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "client_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CreditNote ───────────────────────────────────────────────────────
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "credit_notes_studio_id_credit_note_number_key" ON "credit_notes"("studio_id", "credit_note_number");
CREATE INDEX "credit_notes_studio_id_idx" ON "credit_notes"("studio_id");
CREATE INDEX "credit_notes_invoice_id_idx" ON "credit_notes"("invoice_id");
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RefundReceipt ────────────────────────────────────────────────────
CREATE TABLE "refund_receipts" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "payment_id" UUID,
    "refund_receipt_number" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "method" "PaymentMethod" NOT NULL DEFAULT 'other',
    "refunded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "refund_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refund_receipts_studio_id_refund_receipt_number_key" ON "refund_receipts"("studio_id", "refund_receipt_number");
CREATE INDEX "refund_receipts_studio_id_idx" ON "refund_receipts"("studio_id");
ALTER TABLE "refund_receipts" ADD CONSTRAINT "refund_receipts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_receipts" ADD CONSTRAINT "refund_receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "client_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
