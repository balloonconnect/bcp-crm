/**
 * Tenant-scoping rules used by tenant-client.ts. Kept as pure functions,
 * independent of the Prisma runtime, so they're unit-testable without a
 * live database — see src/__tests__/tenant-scope.test.ts.
 *
 * See docs/tenant-isolation.md for the full rationale.
 */

/** Every model whose rows carry `studioId` directly (see docs/database-conventions.md). */
export const TENANT_SCOPED_MODELS = [
  "studioBrand",
  "studioDomain",
  "studioBranch",
  "studioSetting",
  "studioUser",
  "studioRole",
  "invitation",
  "subscription",
  "licenseKey",
  "activation",
  "usageRecord",
  "featureFlag",
  "auditLog",
  "loginHistory",
  "session",
  "apiKey",
  "webhookEndpoint",
  "notification",
  "jobRecord",
  "supportRequest",
  "payment",
  "branchBrand",
  "studioBrandVersion",
  "verificationToken",
  "recoveryCode",
  "onboardingSession",
  "client",
  "lead",
  "event",
  "quotation",
  "invoice",
  "clientPayment",
  "gallery",
  "album",
  "expense",
  "dashboardPreference",
  "leadNote",
  "leadAttachment",
  "leadCommunication",
  "enquiryForm",
  "enquiryFormSubmission",
  "clientFamilyContact",
  "clientCommunication",
  "clientContract",
  "printOrder",
  "delivery",
  "clientFeedback",
  "service",
  "package",
  "quotationRevision",
  "quotationView",
  "quotationApproval",
  "booking",
  "equipment",
  "workflowTemplate",
  "taskTemplate",
  "workflowInstance",
  "task",
  "taskComment",
  "taskAttachment",
  "teamMemberProfile",
  "teamDocument",
  "teamEquipmentAssignment",
  "attendanceRecord",
  "leaveRequest",
  "performanceNote",
  "freelancerPayment",
  "equipmentMaintenanceRecord",
  "equipmentRepairRecord",
  "equipmentRentalRecord",
  "equipmentDamageReport",
  "equipmentCheckoutRecord",
  "vendor",
  "costCentre",
  "purchaseOrder",
  "vendorBill",
  "receipt",
  "creditNote",
  "refundReceipt",
  "whatsAppConfig",
  "whatsAppTemplate",
  "whatsAppMessage",
  "whatsAppOptStatus",
  "emailConfig",
  "emailTemplate",
  "emailMessage",
  "emailUnsubscribe",
  "notificationPreference",
  "pushSubscription",
  "galleryPhoto",
  "uploadSession",
  "faceCollection",
  "faceSearchSession",
  "faceConsentLog",
  "photoAnalysis",
  "photoAnalysisReviewLog",
  "duplicateGroup",
  "cullingSession",
  "albumSuggestion",
  "clientPortalSession",
  "clientSupportRequest",
  "contractTemplate",
  "product",
  "coupon",
  "commerceOrder",
  "copilotConversation",
  "copilotAuditLogEntry",
  "marketingBrandVoiceSettings",
  "marketingContentRequest",
  "brandVoiceExample",
  "automationRule",
  "automationExecution",
  "savedReport",
  "scheduledReport",
  "recentSearch",
  "savedSearch",
  "importJob",
  "exportJob",
  "studioBackup",
  "studioRestoreJob",
  "note",
  "studioDeletionRequest",
  "eventProductPricing",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

/** Models where `studioId` is nullable in the schema (platform-wide rows can exist). */
export const NULLABLE_STUDIO_ID_MODELS: readonly TenantScopedModel[] = [
  "featureFlag",
  "auditLog",
  "loginHistory",
  "session",
  "jobRecord",
  "verificationToken",
  "recoveryCode",
  "onboardingSession",
];

export function isTenantScopedModel(model: string): model is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

export class CrossTenantAccessError extends Error {
  constructor(model: string, attemptedStudioId: unknown, scopedStudioId: string) {
    super(
      `Refusing to query "${model}" with studioId "${String(attemptedStudioId)}" ` +
        `from a client scoped to studio "${scopedStudioId}". This usually means a ` +
        `studioId was hardcoded or passed through from the wrong request context.`,
    );
    this.name = "CrossTenantAccessError";
  }
}

/**
 * Merges `studioId` into a `where` clause for read/delete-style operations.
 * If the caller already specified a different studioId, throws rather than
 * silently overriding it — a mismatch is far more likely to be a bug than
 * an intentional cross-tenant query.
 */
export function scopeWhere<W extends Record<string, unknown> | undefined>(
  model: string,
  where: W,
  studioId: string,
): W & { studioId: string } {
  const current = where as Record<string, unknown> | undefined;
  const existing = current?.studioId;

  if (existing !== undefined && existing !== studioId) {
    throw new CrossTenantAccessError(model, existing, studioId);
  }

  return { ...(current ?? {}), studioId } as W & { studioId: string };
}

/**
 * Merges `studioId` into `data` for create-style operations, same
 * mismatch-throws-rather-than-overrides behavior as scopeWhere.
 */
export function scopeData<D extends Record<string, unknown> | undefined>(
  model: string,
  data: D,
  studioId: string,
): D & { studioId: string } {
  const current = data as Record<string, unknown> | undefined;
  const existing = current?.studioId;

  if (existing !== undefined && existing !== studioId) {
    throw new CrossTenantAccessError(model, existing, studioId);
  }

  return { ...(current ?? {}), studioId } as D & { studioId: string };
}

/** Applies scopeData to each item in a `createMany`-style `data` array. */
export function scopeDataArray<D extends Record<string, unknown>>(
  model: string,
  data: D[],
  studioId: string,
): (D & { studioId: string })[] {
  return data.map((item) => scopeData(model, item, studioId));
}

/** Which Prisma operations take a `where` vs. a `data` (or both) argument. */
export const OPERATIONS_WITH_WHERE = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

export const OPERATIONS_WITH_CREATE_DATA = new Set(["create"]);
export const OPERATIONS_WITH_CREATE_MANY_DATA = new Set(["createMany"]);

/** `upsert` needs studioId enforced in `where`, `create`, and `update` all at once. */
export const UPSERT_OPERATION = "upsert";
