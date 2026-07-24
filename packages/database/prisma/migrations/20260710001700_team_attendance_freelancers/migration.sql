-- Team, attendance & freelancers (Prompt 20): employment type/skills/
-- availability on StudioUser, a separate sensitive HR profile table,
-- documents, equipment custody tracking, attendance, leave, qualitative
-- performance notes, and freelancer payment tracking. Additive on top
-- of 20260710001600.

CREATE TYPE "EmploymentType" AS ENUM ('employee', 'freelancer');
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'busy', 'on_leave', 'unavailable');
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'half_day', 'leave', 'holiday');
CREATE TYPE "LeaveType" AS ENUM ('sick', 'casual', 'paid', 'unpaid', 'other');
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE "TeamDocumentType" AS ENUM ('contract', 'id_proof', 'certification', 'other');
CREATE TYPE "FreelancerPaymentStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- ── StudioUser: new columns ──────────────────────────────────────────
ALTER TABLE "studio_users"
  ADD COLUMN "employment_type" "EmploymentType",
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'available';

-- ── TeamMemberProfile ────────────────────────────────────────────────
CREATE TABLE "team_member_profiles" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "salary_amount" INTEGER,
    "freelancer_rate_amount" INTEGER,
    "freelancer_rate_unit" TEXT,
    "payment_terms" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc_code" TEXT,
    "bank_name" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_member_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_member_profiles_studio_user_id_key" ON "team_member_profiles"("studio_user_id");
CREATE INDEX "team_member_profiles_studio_id_idx" ON "team_member_profiles"("studio_id");
ALTER TABLE "team_member_profiles" ADD CONSTRAINT "team_member_profiles_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_member_profiles" ADD CONSTRAINT "team_member_profiles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeamDocument ─────────────────────────────────────────────────────
CREATE TABLE "team_documents" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" "TeamDocumentType" NOT NULL DEFAULT 'other',
    "file_key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "team_documents_studio_user_id_idx" ON "team_documents"("studio_user_id");
CREATE INDEX "team_documents_studio_id_idx" ON "team_documents"("studio_id");
ALTER TABLE "team_documents" ADD CONSTRAINT "team_documents_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_documents" ADD CONSTRAINT "team_documents_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeamEquipmentAssignment ──────────────────────────────────────────
CREATE TABLE "team_equipment_assignments" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "team_equipment_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "team_equipment_assignments_studio_user_id_idx" ON "team_equipment_assignments"("studio_user_id");
CREATE INDEX "team_equipment_assignments_equipment_id_idx" ON "team_equipment_assignments"("equipment_id");
CREATE INDEX "team_equipment_assignments_studio_id_idx" ON "team_equipment_assignments"("studio_id");
ALTER TABLE "team_equipment_assignments" ADD CONSTRAINT "team_equipment_assignments_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_equipment_assignments" ADD CONSTRAINT "team_equipment_assignments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_equipment_assignments" ADD CONSTRAINT "team_equipment_assignments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AttendanceRecord ─────────────────────────────────────────────────
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attendance_records_studio_user_id_date_key" ON "attendance_records"("studio_user_id", "date");
CREATE INDEX "attendance_records_studio_id_idx" ON "attendance_records"("studio_id");
CREATE INDEX "attendance_records_studio_id_date_idx" ON "attendance_records"("studio_id", "date");
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── LeaveRequest ─────────────────────────────────────────────────────
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL DEFAULT 'casual',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_studio_user_id_idx" ON "leave_requests"("studio_user_id");
CREATE INDEX "leave_requests_studio_id_idx" ON "leave_requests"("studio_id");
CREATE INDEX "leave_requests_studio_id_status_idx" ON "leave_requests"("studio_id", "status");
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PerformanceNote ──────────────────────────────────────────────────
CREATE TABLE "performance_notes" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "period_label" TEXT NOT NULL,
    "rating_score" INTEGER,
    "note" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "performance_notes_studio_user_id_idx" ON "performance_notes"("studio_user_id");
CREATE INDEX "performance_notes_studio_id_idx" ON "performance_notes"("studio_id");
ALTER TABLE "performance_notes" ADD CONSTRAINT "performance_notes_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_notes" ADD CONSTRAINT "performance_notes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FreelancerPayment ────────────────────────────────────────────────
CREATE TABLE "freelancer_payments" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "event_id" UUID,
    "booking_id" UUID,
    "amount" INTEGER NOT NULL,
    "status" "FreelancerPaymentStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "freelancer_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "freelancer_payments_studio_user_id_idx" ON "freelancer_payments"("studio_user_id");
CREATE INDEX "freelancer_payments_studio_id_idx" ON "freelancer_payments"("studio_id");
CREATE INDEX "freelancer_payments_studio_id_status_idx" ON "freelancer_payments"("studio_id", "status");
ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
