-- Automation builder (Prompt 38): a visual trigger→action automation
-- system — 16 triggers, 11 action types (including wait and condition
-- branch), a real step graph for the visual editor, test-mode
-- execution, enable/disable, execution history with per-step retry/
-- failure tracking, per-rule rate limiting, and platform-wide usage
-- enforcement (reusing the already-existing maxAutomationRunsPerMonth
-- plan-limit dimension). Additive on top of 20260710003400.

CREATE TYPE "AutomationTriggerType" AS ENUM ('lead_created', 'lead_inactive', 'follow_up_due', 'quotation_sent', 'quotation_viewed', 'quotation_accepted', 'booking_confirmed', 'payment_due', 'payment_overdue', 'event_upcoming', 'gallery_published', 'selection_pending', 'album_approved', 'delivery_completed', 'birthday', 'anniversary');
CREATE TYPE "AutomationActionType" AS ENUM ('send_whatsapp', 'send_email', 'create_task', 'assign_user', 'update_status', 'add_tag', 'generate_invoice', 'send_notification', 'call_webhook', 'wait', 'condition_branch');
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'retrying', 'rate_limited');
CREATE TYPE "AutomationStepExecutionStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped', 'retrying');

-- ── AutomationRule ───────────────────────────────────────────────────
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "AutomationTriggerType" NOT NULL,
    "trigger_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "max_executions_per_hour" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_rules_studio_id_idx" ON "automation_rules"("studio_id");
CREATE INDEX "automation_rules_studio_id_trigger_type_idx" ON "automation_rules"("studio_id", "trigger_type");
CREATE INDEX "automation_rules_studio_id_is_active_idx" ON "automation_rules"("studio_id", "is_active");
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AutomationStep ───────────────────────────────────────────────────
CREATE TABLE "automation_steps" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "action_type" "AutomationActionType" NOT NULL,
    "action_config" JSONB,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "next_step_id" UUID,
    "condition_true_step_id" UUID,
    "condition_false_step_id" UUID,
    "is_entry_point" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_steps_rule_id_idx" ON "automation_steps"("rule_id");
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AutomationExecution ──────────────────────────────────────────────
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'pending',
    "is_test_run" BOOLEAN NOT NULL DEFAULT false,
    "trigger_context" JSONB NOT NULL,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_executions_rule_id_idx" ON "automation_executions"("rule_id");
CREATE INDEX "automation_executions_studio_id_idx" ON "automation_executions"("studio_id");
CREATE INDEX "automation_executions_rule_id_started_at_idx" ON "automation_executions"("rule_id", "started_at");
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AutomationStepExecution ──────────────────────────────────────────
CREATE TABLE "automation_step_executions" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "status" "AutomationStepExecutionStatus" NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "result_data" JSONB,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_step_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "automation_step_executions_execution_id_idx" ON "automation_step_executions"("execution_id");
ALTER TABLE "automation_step_executions" ADD CONSTRAINT "automation_step_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
