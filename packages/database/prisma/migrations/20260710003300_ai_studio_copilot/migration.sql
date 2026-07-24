-- AI Studio Copilot (Prompt 36): chat conversations with source
-- references, a draft/confirmed/executed/reversed action lifecycle
-- (build phases 2-3), and an append-only audit log covering every
-- tool call and action the copilot took. Additive on top of
-- 20260710003200.

CREATE TYPE "CopilotMessageRole" AS ENUM ('user', 'assistant');
CREATE TYPE "CopilotActionStatus" AS ENUM ('draft', 'confirmed', 'executed', 'rejected', 'reversed');
CREATE TYPE "CopilotAuditAction" AS ENUM ('query_received', 'tool_called', 'action_proposed', 'action_confirmed', 'action_rejected', 'action_executed', 'action_reversed', 'permission_denied');

-- ── CopilotConversation ──────────────────────────────────────────────
CREATE TABLE "copilot_conversations" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copilot_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "copilot_conversations_studio_id_idx" ON "copilot_conversations"("studio_id");
CREATE INDEX "copilot_conversations_user_id_idx" ON "copilot_conversations"("user_id");
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CopilotMessage ───────────────────────────────────────────────────
CREATE TABLE "copilot_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "CopilotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "source_references" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copilot_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "copilot_messages_conversation_id_idx" ON "copilot_messages"("conversation_id");
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "copilot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CopilotAction ────────────────────────────────────────────────────
CREATE TABLE "copilot_actions" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID,
    "action_type" TEXT NOT NULL,
    "status" "CopilotActionStatus" NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL,
    "result_data" JSONB,
    "is_reversible" BOOLEAN NOT NULL DEFAULT false,
    "reversal_data" JSONB,
    "reversed_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copilot_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "copilot_actions_conversation_id_idx" ON "copilot_actions"("conversation_id");
CREATE INDEX "copilot_actions_conversation_id_status_idx" ON "copilot_actions"("conversation_id", "status");
ALTER TABLE "copilot_actions" ADD CONSTRAINT "copilot_actions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "copilot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "copilot_actions" ADD CONSTRAINT "copilot_actions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "copilot_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CopilotAuditLogEntry ─────────────────────────────────────────────
CREATE TABLE "copilot_audit_log_entries" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "action" "CopilotAuditAction" NOT NULL,
    "tool_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copilot_audit_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "copilot_audit_log_entries_studio_id_idx" ON "copilot_audit_log_entries"("studio_id");
CREATE INDEX "copilot_audit_log_entries_conversation_id_idx" ON "copilot_audit_log_entries"("conversation_id");
CREATE INDEX "copilot_audit_log_entries_studio_id_created_at_idx" ON "copilot_audit_log_entries"("studio_id", "created_at");
ALTER TABLE "copilot_audit_log_entries" ADD CONSTRAINT "copilot_audit_log_entries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "copilot_audit_log_entries" ADD CONSTRAINT "copilot_audit_log_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
