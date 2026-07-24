-- Monitoring & observability (Prompt 46): per-service health check
-- history (the raw material for the platform health dashboard, alert
-- rules, and uptime tracking), configurable alert rules and their
-- firing history, and incident/incident-update history for the public
-- status page. All four models are deliberately platform-wide, not
-- tenant-scoped -- infrastructure health and incidents apply to the
-- whole platform, not one studio. Additive on top of 20260710004000.

CREATE TYPE "MonitoredService" AS ENUM ('api', 'database', 'redis', 'storage', 'ai_provider', 'whatsapp', 'payment_provider', 'queue');
CREATE TYPE "ServiceHealthStatus" AS ENUM ('healthy', 'degraded', 'unhealthy');
CREATE TYPE "IncidentSeverity" AS ENUM ('sev1', 'sev2', 'sev3');
CREATE TYPE "IncidentStatus" AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

-- -- ServiceHealthCheck ----------------------------------------------------
CREATE TABLE "service_health_checks" (
    "id" UUID NOT NULL,
    "service" "MonitoredService" NOT NULL,
    "status" "ServiceHealthStatus" NOT NULL,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_health_checks_service_checked_at_idx" ON "service_health_checks"("service", "checked_at");

-- -- AlertRule ---------------------------------------------------------------
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "service" "MonitoredService" NOT NULL,
    "trigger_status" "ServiceHealthStatus" NOT NULL,
    "consecutive_failures_required" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notify_emails" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- -- TriggeredAlert -----------------------------------------------------------
CREATE TABLE "triggered_alerts" (
    "id" UUID NOT NULL,
    "alert_rule_id" UUID NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "triggered_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "triggered_alerts_alert_rule_id_idx" ON "triggered_alerts"("alert_rule_id");
CREATE INDEX "triggered_alerts_alert_rule_id_resolved_at_idx" ON "triggered_alerts"("alert_rule_id", "resolved_at");
ALTER TABLE "triggered_alerts" ADD CONSTRAINT "triggered_alerts_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -- Incident ------------------------------------------------------------------
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'investigating',
    "affected_services" TEXT[] NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "incidents_status_idx" ON "incidents"("status");
CREATE INDEX "incidents_started_at_idx" ON "incidents"("started_at");

-- -- IncidentUpdate --------------------------------------------------------------
CREATE TABLE "incident_updates" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "incident_updates_incident_id_idx" ON "incident_updates"("incident_id");
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
