-- Contracts & e-signature (Prompt 34): studio-managed contract
-- templates (named-variable sections covering payment/cancellation/
-- delivery/copyright/model-release/privacy-consent terms), a real
-- e-signature flow (OTP verification, IP address, timestamp, optional
-- witness), append-only version history, an append-only audit trail,
-- and a generated PDF signing certificate. Additive on top of
-- 20260710003000.

CREATE TYPE "ContractAuditAction" AS ENUM ('created', 'sent', 'viewed', 'otp_requested', 'otp_verified', 'signed', 'witnessed', 'certificate_generated', 'revision_requested', 'voided');

-- ── ClientContract: new columns ──────────────────────────────────────
ALTER TABLE "client_contracts"
  ADD COLUMN "template_id" UUID,
  ADD COLUMN "public_token" TEXT,
  ADD COLUMN "current_version_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "variable_values" JSONB,
  ADD COLUMN "witness_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "witness_name" TEXT,
  ADD COLUMN "witness_email" TEXT,
  ADD COLUMN "witness_signed_at" TIMESTAMP(3),
  ADD COLUMN "witness_ip_address" TEXT,
  ADD COLUMN "signer_ip_address" TEXT,
  ADD COLUMN "signer_user_agent" TEXT,
  ADD COLUMN "signer_otp_code" TEXT,
  ADD COLUMN "signer_otp_expires_at" TIMESTAMP(3),
  ADD COLUMN "signer_otp_verified_at" TIMESTAMP(3),
  ADD COLUMN "certificate_file_key" TEXT;

-- Backfill a public_token for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "client_contracts" SET "public_token" = gen_random_uuid()::text WHERE "public_token" IS NULL;
ALTER TABLE "client_contracts" ALTER COLUMN "public_token" SET NOT NULL;
CREATE UNIQUE INDEX "client_contracts_public_token_key" ON "client_contracts"("public_token");

-- ── ContractTemplate ─────────────────────────────────────────────────
CREATE TABLE "contract_templates" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sections" JSONB NOT NULL,
    "variables" TEXT[] NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_templates_studio_id_name_key" ON "contract_templates"("studio_id", "name");
CREATE INDEX "contract_templates_studio_id_idx" ON "contract_templates"("studio_id");
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ContractVersion ──────────────────────────────────────────────────
CREATE TABLE "contract_versions" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "body_html" TEXT NOT NULL,
    "variable_values" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_versions_contract_id_version_number_key" ON "contract_versions"("contract_id", "version_number");
CREATE INDEX "contract_versions_contract_id_idx" ON "contract_versions"("contract_id");
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "client_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ContractAuditLogEntry ────────────────────────────────────────────
CREATE TABLE "contract_audit_log_entries" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "action" "ContractAuditAction" NOT NULL,
    "actor_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_audit_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contract_audit_log_entries_contract_id_idx" ON "contract_audit_log_entries"("contract_id");
CREATE INDEX "contract_audit_log_entries_contract_id_created_at_idx" ON "contract_audit_log_entries"("contract_id", "created_at");
ALTER TABLE "contract_audit_log_entries" ADD CONSTRAINT "contract_audit_log_entries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "client_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
