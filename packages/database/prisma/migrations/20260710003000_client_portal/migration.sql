-- Client portal (Prompt 33): OTP-authenticated client login scoped to
-- the whole client relationship (not one gallery/album), a client-
-- initiated support ticket thread, and a typed-name signature field
-- for contract signing from the portal. Named ClientSupportRequest
-- (not SupportRequest) specifically to avoid colliding with the
-- already-existing SupportRequest model, which is an unrelated
-- studio-to-platform ticket relationship — reuses that model's
-- SupportRequestStatus enum directly since the same lifecycle applies.
-- Additive on top of 20260710002900.

ALTER TABLE "client_contracts" ADD COLUMN "signed_by_name" TEXT;

-- ── ClientPortalSession ──────────────────────────────────────────────
CREATE TABLE "client_portal_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_portal_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_portal_sessions_session_token_key" ON "client_portal_sessions"("session_token");
CREATE INDEX "client_portal_sessions_studio_id_idx" ON "client_portal_sessions"("studio_id");
CREATE INDEX "client_portal_sessions_client_id_idx" ON "client_portal_sessions"("client_id");
ALTER TABLE "client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientSupportRequest ─────────────────────────────────────────────
CREATE TABLE "client_support_requests" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    CONSTRAINT "client_support_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_support_requests_studio_id_idx" ON "client_support_requests"("studio_id");
CREATE INDEX "client_support_requests_client_id_idx" ON "client_support_requests"("client_id");
CREATE INDEX "client_support_requests_studio_id_status_idx" ON "client_support_requests"("studio_id", "status");
ALTER TABLE "client_support_requests" ADD CONSTRAINT "client_support_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_support_requests" ADD CONSTRAINT "client_support_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientSupportRequestReply ────────────────────────────────────────
CREATE TABLE "client_support_request_replies" (
    "id" UUID NOT NULL,
    "support_request_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_support_request_replies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_support_request_replies_support_request_id_idx" ON "client_support_request_replies"("support_request_id");
ALTER TABLE "client_support_request_replies" ADD CONSTRAINT "client_support_request_replies_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "client_support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
