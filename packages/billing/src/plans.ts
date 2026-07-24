import type { PlanLimits } from "./plan-limits";
import { UNLIMITED_PLAN_LIMITS } from "./plan-limits";

export type PlanKey = "starter" | "professional" | "business" | "enterprise" | "custom";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthly: number; // paise
  priceYearly: number; // paise
  limits: PlanLimits;
}

/**
 * The 5 plans. `custom` has every limit set to `null` (unlimited) by
 * default — a Custom plan's real limits are whatever platform-admin
 * negotiates and sets per-studio via `PATCH /platform/plans/:id` or a
 * studio-specific override; the catalog entry here is just a sensible
 * unlimited starting point, not a fixed tier like the other four.
 */
export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter",
    description: "For a single photographer just getting started.",
    priceMonthly: 99900,
    priceYearly: 999900,
    limits: {
      maxUsers: 2,
      maxBranches: 1,
      maxStorageGb: 50,
      maxLeads: 100,
      maxClients: 100,
      maxEvents: 20,
      maxGalleries: 20,
      maxMonthlyUploads: 2000,
      maxAiFaceSearchesPerMonth: 0,
      maxAiAnalysisJobsPerMonth: 0,
      maxWhatsappMessagesPerMonth: 200,
      maxEmailMessagesPerMonth: 500,
      maxAutomationRunsPerMonth: 0,
      maxCustomDomains: 0,
      whiteLabelAccess: false,
      apiAccess: false,
    },
  },
  professional: {
    key: "professional",
    name: "Professional",
    description: "For an established studio with a small team.",
    priceMonthly: 249900,
    priceYearly: 2499900,
    limits: {
      maxUsers: 10,
      maxBranches: 3,
      maxStorageGb: 500,
      maxLeads: 1000,
      maxClients: 1000,
      maxEvents: 100,
      maxGalleries: 100,
      maxMonthlyUploads: 20000,
      maxAiFaceSearchesPerMonth: 1000,
      maxAiAnalysisJobsPerMonth: 500,
      maxWhatsappMessagesPerMonth: 2000,
      maxEmailMessagesPerMonth: 5000,
      maxAutomationRunsPerMonth: 200,
      maxCustomDomains: 1,
      whiteLabelAccess: true,
      apiAccess: false,
    },
  },
  business: {
    key: "business",
    name: "Business",
    description: "For a multi-branch studio group.",
    priceMonthly: 599900,
    priceYearly: 5999900,
    limits: {
      maxUsers: 50,
      maxBranches: 10,
      maxStorageGb: 2000,
      maxLeads: 10000,
      maxClients: 10000,
      maxEvents: 500,
      maxGalleries: 500,
      maxMonthlyUploads: 100000,
      maxAiFaceSearchesPerMonth: 10000,
      maxAiAnalysisJobsPerMonth: 5000,
      maxWhatsappMessagesPerMonth: 20000,
      maxEmailMessagesPerMonth: 50000,
      maxAutomationRunsPerMonth: 2000,
      maxCustomDomains: 5,
      whiteLabelAccess: true,
      apiAccess: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Custom limits, dedicated support, SSO.",
    priceMonthly: 0, // negotiated
    priceYearly: 0,
    limits: UNLIMITED_PLAN_LIMITS,
  },
  custom: {
    key: "custom",
    name: "Custom",
    description: "A negotiated plan with limits set individually per studio.",
    priceMonthly: 0,
    priceYearly: 0,
    limits: UNLIMITED_PLAN_LIMITS,
  },
};

export const PLAN_KEYS: PlanKey[] = ["starter", "professional", "business", "enterprise", "custom"];
