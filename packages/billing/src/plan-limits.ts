import { z } from "zod";

/**
 * Every plan-limit dimension. Numeric dimensions are `number | null`
 * (`null` = unlimited — matches @bcp/permissions' `checkPlanLimit`, which
 * already treats a `null`/`undefined` limit as unlimited); the two
 * feature-gate dimensions (white-label access, API access) are booleans,
 * not counts.
 *
 * Stored as `SubscriptionPlan.limits` (JSON) — see
 * packages/database/docs/database-conventions.md § "Plan limits" for why
 * this is one JSON object rather than 16 nullable typed columns.
 */
export const planLimitsSchema = z.object({
  // Structural
  maxUsers: z.number().int().nonnegative().nullable(),
  maxBranches: z.number().int().nonnegative().nullable(),
  maxStorageGb: z.number().int().nonnegative().nullable(),

  // Business objects (CRM entities — metered by count, not monthly)
  maxLeads: z.number().int().nonnegative().nullable(),
  maxClients: z.number().int().nonnegative().nullable(),
  maxEvents: z.number().int().nonnegative().nullable(),
  maxGalleries: z.number().int().nonnegative().nullable(),

  // Monthly-recurring quotas (reset each billing period — see UsageRecord)
  maxMonthlyUploads: z.number().int().nonnegative().nullable(),
  maxAiFaceSearchesPerMonth: z.number().int().nonnegative().nullable(),
  maxAiAnalysisJobsPerMonth: z.number().int().nonnegative().nullable(),
  maxWhatsappMessagesPerMonth: z.number().int().nonnegative().nullable(),
  maxEmailMessagesPerMonth: z.number().int().nonnegative().nullable(),
  maxAutomationRunsPerMonth: z.number().int().nonnegative().nullable(),

  // Domains
  maxCustomDomains: z.number().int().nonnegative().nullable(),

  // Feature gates (on/off, not counted)
  whiteLabelAccess: z.boolean(),
  apiAccess: z.boolean(),
});

export type PlanLimits = z.infer<typeof planLimitsSchema>;

export type PlanLimitDimension = keyof PlanLimits;

/** Which dimensions are monthly-recurring quotas (reset each period) vs. standing counts (checked against a live total). */
export const MONTHLY_RESETTING_DIMENSIONS: PlanLimitDimension[] = [
  "maxMonthlyUploads",
  "maxAiFaceSearchesPerMonth",
  "maxAiAnalysisJobsPerMonth",
  "maxWhatsappMessagesPerMonth",
  "maxEmailMessagesPerMonth",
  "maxAutomationRunsPerMonth",
];

/** The UsageRecord.metric key each monthly-resetting dimension is metered under. */
export const DIMENSION_USAGE_METRIC: Partial<Record<PlanLimitDimension, string>> = {
  maxMonthlyUploads: "uploads",
  maxAiFaceSearchesPerMonth: "ai_face_searches",
  maxAiAnalysisJobsPerMonth: "ai_analysis_jobs",
  maxWhatsappMessagesPerMonth: "whatsapp_messages",
  maxEmailMessagesPerMonth: "emails_sent",
  maxAutomationRunsPerMonth: "automation_runs",
};

export const FEATURE_GATE_DIMENSIONS: PlanLimitDimension[] = ["whiteLabelAccess", "apiAccess"];

/** Numeric (countable) dimensions — everything except the two feature gates. */
export const NUMERIC_DIMENSIONS: PlanLimitDimension[] = (
  Object.keys(planLimitsSchema.shape) as PlanLimitDimension[]
).filter((d) => !FEATURE_GATE_DIMENSIONS.includes(d));

export const UNLIMITED_PLAN_LIMITS: PlanLimits = {
  maxUsers: null,
  maxBranches: null,
  maxStorageGb: null,
  maxLeads: null,
  maxClients: null,
  maxEvents: null,
  maxGalleries: null,
  maxMonthlyUploads: null,
  maxAiFaceSearchesPerMonth: null,
  maxAiAnalysisJobsPerMonth: null,
  maxWhatsappMessagesPerMonth: null,
  maxEmailMessagesPerMonth: null,
  maxAutomationRunsPerMonth: null,
  maxCustomDomains: null,
  whiteLabelAccess: true,
  apiAccess: true,
};
