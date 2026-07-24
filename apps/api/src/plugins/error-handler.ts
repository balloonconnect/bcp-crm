import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AccountLockedError } from "@bcp/auth";
import { isGuardError, guardErrorStatus } from "@bcp/permissions";

/**
 * Status codes for every domain error thrown across apps/api's services
 * that isn't already a guard error (@bcp/permissions) or AccountLockedError
 * (handled explicitly below). Keyed by the error's `.code` string rather
 * than importing every error class here — new service errors just need to
 * add an entry, not a new `instanceof` branch.
 */
const DOMAIN_ERROR_STATUS: Record<string, number> = {
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  INVALID_REFRESH_TOKEN: 401,
  NO_REFRESH_TOKEN: 401,
  SESSION_REVOKED: 401,
  SESSION_NOT_FOUND: 404,
  INVITATION_INVALID: 400,
  TWO_FACTOR_ERROR: 400,
  TWO_FACTOR_REQUIRED: 401,
  GOOGLE_SIGNIN_ERROR: 400,
  STUDIO_NOT_RESOLVED: 400,
  MISSING_STUDIO_SLUG: 400,
  VERSION_NOT_FOUND: 404,
  ASSET_VALIDATION_FAILED: 422,
  INVALID_DOMAIN: 400,
  DOMAIN_ALREADY_EXISTS: 409,
  DOMAIN_NOT_FOUND: 404,
  DOMAIN_NOT_READY: 409,
  STUDIO_NOT_FOUND: 404,
  LICENSE_NOT_FOUND: 404,
  LICENSE_NOT_RENEWABLE: 409,
  LICENSE_KEY_INVALID: 401,
  ACTIVATION_DENIED: 403,
  JOB_NOT_FOUND: 404,
  JOB_NOT_RETRYABLE: 409,
  ONBOARDING_SESSION_NOT_FOUND: 404,
  STUDIO_NOT_PROVISIONED: 409,
  SLUG_TAKEN: 409,
  ONBOARDING_INCOMPLETE: 409,
  ROLE_NOT_FOUND: 404,
  INVOICE_NOT_FOUND: 404,
  REMINDER_TARGET_NOT_FOUND: 422,
  LEAD_NOT_FOUND: 404,
  LEAD_ATTACHMENT_NOT_FOUND: 404,
  ENQUIRY_FORM_NOT_FOUND: 404,
  ENQUIRY_FORM_SLUG_TAKEN: 409,
  ENQUIRY_FORM_SUBMISSION_INVALID: 422,
  CLIENT_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,
  PACKAGE_NOT_FOUND: 404,
  INVALID_PAYMENT_SCHEDULE: 422,
  QUOTATION_NOT_FOUND: 404,
  INVALID_QUOTATION_TRANSITION: 409,
  QUOTATION_NOT_ACCEPTED: 409,
  QUOTATION_OTP_INVALID: 422,
  RECIPIENT_NOT_FOUND: 422,
  BOOKING_NOT_FOUND: 404,
  INVALID_BOOKING_TRANSITION: 409,
  EVENT_NOT_FOUND: 404,
  EQUIPMENT_NOT_FOUND: 404,
  WORKFLOW_TEMPLATE_NOT_FOUND: 404,
  TASK_TEMPLATE_NOT_FOUND: 404,
  DEPENDENCY_CYCLE: 422,
  NO_WORKFLOW_TEMPLATE_RESOLVED: 422,
  TASK_NOT_FOUND: 404,
  TASK_BLOCKED: 409,
  TEAM_MEMBER_NOT_FOUND: 404,
  OVERLAPPING_LEAVE: 409,
  EQUIPMENT_DOUBLE_BOOKED: 409,
  EXPENSE_NOT_FOUND: 404,
  VENDOR_NOT_FOUND: 404,
  PURCHASE_ORDER_NOT_FOUND: 404,
  VENDOR_BILL_NOT_FOUND: 404,
  WHATSAPP_NOT_CONFIGURED: 422,
  WHATSAPP_OPTED_OUT: 422,
  EMAIL_UNSUBSCRIBED: 422,
  EMAIL_PROVIDER_NOT_SUPPORTED: 422,
  GALLERY_NOT_FOUND: 404,
  GALLERY_ACCESS_DENIED: 403,
  INVALID_GALLERY_PASSWORD: 401,
  INVALID_GALLERY_OTP: 401,
  GALLERY_DOWNLOAD_NOT_ALLOWED: 403,
  UPLOAD_SESSION_NOT_FOUND: 404,
  DUPLICATE_UPLOAD: 409,
  INVALID_UPLOAD_STATE: 409,
  FACE_PROVIDER_NOT_CONFIGURED: 422,
  FACE_SEARCH_NOT_FOUND: 404,
  FACE_SEARCH_NOT_ENABLED: 422,
  FACE_SEARCH_CONSENT_REQUIRED: 428,
  PHOTO_ANALYSIS_NOT_FOUND: 404,
  DUPLICATE_GROUP_NOT_FOUND: 404,
  AI_NOT_CONFIGURED: 422,
  CULLING_SESSION_NOT_FOUND: 404,
  ALBUM_SUGGESTION_NOT_FOUND: 404,
  ALBUM_NOT_FOUND: 404,
  ALBUM_ACCESS_DENIED: 403,
  INVALID_ALBUM_OTP: 401,
  SELECTION_LOCKED: 409,
  SELECTION_LIMIT_REACHED: 422,
  INVALID_STAGE_TRANSITION: 409,
  FULL_APPROVAL_NOT_READY: 422,
  REVISION_LIMIT_REACHED: 422,
  INVALID_PORTAL_OTP: 401,
  PORTAL_SESSION_EXPIRED: 401,
  CONTRACT_TEMPLATE_NOT_FOUND: 404,
  CONTRACT_NOT_FOUND: 404,
  CONTRACT_OTP_NOT_ALLOWED: 422,
  INVALID_CONTRACT_OTP: 401,
  PRODUCT_NOT_FOUND: 404,
  COUPON_NOT_FOUND: 404,
  COMMERCE_ORDER_NOT_FOUND: 404,
  INVALID_COUPON: 422,
  COPILOT_CONVERSATION_NOT_FOUND: 404,
  COPILOT_ACTION_NOT_FOUND: 404,
  COPILOT_TOOL_NOT_ALLOWED: 403,
  MARKETING_REQUEST_NOT_FOUND: 404,
  AUTOMATION_RULE_NOT_FOUND: 404,
  AUTOMATION_STEP_NOT_FOUND: 404,
  INVALID_AUTOMATION_GRAPH: 422,
  AUTOMATION_RATE_LIMITED: 429,
  SAVED_REPORT_NOT_FOUND: 404,
  // (search routes have no dedicated domain errors beyond the generic ones already covered)
  IMPORT_JOB_NOT_FOUND: 404,
  EXPORT_JOB_NOT_FOUND: 404,
  BACKUP_NOT_FOUND: 404,
  BACKUP_NOT_CONFIGURED: 422,
  INVALID_APPROVAL_STATE: 409,
  JOB_NOT_CANCELLABLE: 409,
};

interface CodedError extends Error {
  code: string;
}

function isCodedError(error: unknown): error is CodedError {
  return error instanceof Error && typeof (error as CodedError).code === "string";
}

export const errorHandlerPlugin = fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() },
      });
    }

    if (error instanceof AccountLockedError) {
      return reply.status(423).send({
        ok: false,
        error: { code: error.code, message: error.message, lockedUntil: error.lockedUntil.toISOString() },
      });
    }

    if (isGuardError(error)) {
      return reply
        .status(guardErrorStatus(error))
        .send({ ok: false, error: { code: (error as { code: string }).code, message: error.message } });
    }

    if (isCodedError(error) && error.code in DOMAIN_ERROR_STATUS) {
      return reply.status(DOMAIN_ERROR_STATUS[error.code]!).send({
        ok: false,
        error: { code: error.code, message: error.message },
      });
    }

    request.log.error({ err: error }, "unhandled error");
    const status = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    return reply.status(status).send({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: status < 500 ? error.message : "Something went wrong" },
    });
  });
});
