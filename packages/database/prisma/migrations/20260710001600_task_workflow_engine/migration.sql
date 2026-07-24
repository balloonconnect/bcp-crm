-- Task & workflow engine (Prompt 19): reusable workflow templates
-- (customizable per event type), task templates with dependencies/SLA/
-- recurrence, workflow instances applied to bookings/events, and real
-- tasks with checklists, comments, attachments, approval steps, and
-- escalation. Additive on top of 20260710001500.

CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'blocked', 'completed', 'cancelled');
CREATE TYPE "TaskApprovalStatus" AS ENUM ('not_required', 'pending', 'approved', 'rejected');
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('daily', 'weekly', 'monthly');

CREATE TABLE "workflow_templates" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_templates_studio_id_idx" ON "workflow_templates"("studio_id");
CREATE INDEX "workflow_templates_studio_id_event_type_idx" ON "workflow_templates"("studio_id", "event_type");
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "task_templates" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "workflow_template_id" UUID NOT NULL,
    "stage_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "default_assignee_role" TEXT,
    "default_due_offset_days" INTEGER,
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "is_approval_step" BOOLEAN NOT NULL DEFAULT false,
    "sla_hours" INTEGER,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_frequency" "RecurrenceFrequency",
    "recurrence_interval" INTEGER,
    "depends_on_task_template_ids" TEXT[] NOT NULL DEFAULT '{}',
    "checklist_items" TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "task_templates_studio_id_idx" ON "task_templates"("studio_id");
CREATE INDEX "task_templates_workflow_template_id_idx" ON "task_templates"("workflow_template_id");
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "workflow_template_id" UUID NOT NULL,
    "booking_id" UUID,
    "event_id" UUID,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_instances_studio_id_idx" ON "workflow_instances"("studio_id");
CREATE INDEX "workflow_instances_booking_id_idx" ON "workflow_instances"("booking_id");
CREATE INDEX "workflow_instances_event_id_idx" ON "workflow_instances"("event_id");
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "workflow_instance_id" UUID,
    "task_template_id" UUID,
    "booking_id" UUID,
    "event_id" UUID,
    "stage_key" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "assignee_id" UUID,
    "due_date" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "is_approval_step" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" "TaskApprovalStatus" NOT NULL DEFAULT 'not_required',
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "sla_hours" INTEGER,
    "sla_deadline" TIMESTAMP(3),
    "escalated_at" TIMESTAMP(3),
    "escalated_to_user_id" UUID,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_frequency" "RecurrenceFrequency",
    "recurrence_interval" INTEGER,
    "next_occurrence_at" TIMESTAMP(3),
    "depends_on_task_ids" TEXT[] NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tasks_studio_id_idx" ON "tasks"("studio_id");
CREATE INDEX "tasks_studio_id_status_idx" ON "tasks"("studio_id", "status");
CREATE INDEX "tasks_studio_id_due_date_idx" ON "tasks"("studio_id", "due_date");
CREATE INDEX "tasks_workflow_instance_id_idx" ON "tasks"("workflow_instance_id");
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX "tasks_booking_id_idx" ON "tasks"("booking_id");
CREATE INDEX "tasks_event_id_idx" ON "tasks"("event_id");
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_escalated_to_user_id_fkey" FOREIGN KEY ("escalated_to_user_id") REFERENCES "studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "task_checklist_items" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "task_checklist_items_task_id_idx" ON "task_checklist_items"("task_id");
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "task_comments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");
CREATE INDEX "task_comments_studio_id_idx" ON "task_comments"("studio_id");
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "task_attachments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments"("task_id");
CREATE INDEX "task_attachments_studio_id_idx" ON "task_attachments"("studio_id");
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
