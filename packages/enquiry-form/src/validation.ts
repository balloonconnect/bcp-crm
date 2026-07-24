import { z } from "zod";
import { formFieldsConfigSchema, getRequiredFieldKeys, type FormFieldsConfig, type ConfigurableFieldKey } from "./field-config";

export const contactMethodEnum = z.enum(["phone", "email", "whatsapp"]);

/** What a studio submits from the form-builder UI to create/update an `EnquiryForm`. */
export const enquiryFormConfigSchema = z.object({
  branchId: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  formFieldsConfig: formFieldsConfigSchema.optional(),
  eventTypes: z.array(z.string().min(1).max(100)).max(30).default([]),
  contactMethods: z.array(contactMethodEnum).min(1).default(["phone", "email"]),
  consentRequired: z.boolean().default(true),
  consentText: z.string().min(1).max(1000).optional(),
  termsUrl: z.string().url().optional(),
  termsText: z.string().max(5000).optional(),
  successMessage: z.string().min(1).max(1000).optional(),
  autoResponseEnabled: z.boolean().default(true),
  autoResponseMessage: z.string().max(2000).optional(),
  defaultAssignedTo: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

/** What the public form actually posts — deliberately loose (`Record<string, unknown>`) since the *allowed* shape depends on that form's own `formFieldsConfig`, checked by `validateSubmissionPayload` below rather than a single fixed zod schema. */
export const submissionEnvelopeSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  consentGiven: z.boolean(),
  utm: z
    .object({
      source: z.string().max(200).optional(),
      medium: z.string().max(200).optional(),
      campaign: z.string().max(200).optional(),
      term: z.string().max(200).optional(),
      content: z.string().max(200).optional(),
    })
    .optional(),
  referrer: z.string().max(500).optional(),
  // Honeypot — real visitors never fill this; see spam.ts.
  website: z.string().max(0).optional(),
  // When the form finished rendering, client-side timestamp (ms) — compared against server receipt time by spam.ts's isTooFast().
  renderedAt: z.number().optional(),
});

export interface SubmissionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Checks a raw payload against a *specific form's* configuration —
 * required fields present and non-empty, consent given if the form
 * requires it. Deliberately permissive about extra/unknown keys (they're
 * just dropped when building the Lead) rather than rejecting the whole
 * submission over one unexpected field.
 */
export function validateSubmissionPayload(
  payload: Record<string, unknown>,
  fieldsConfig: FormFieldsConfig,
  consentGiven: boolean,
  consentRequired: boolean,
): SubmissionValidationResult {
  const errors: string[] = [];

  if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length === 0) {
    errors.push("Name is required.");
  }

  for (const key of getRequiredFieldKeys(fieldsConfig)) {
    const value = payload[key as ConfigurableFieldKey];
    if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
      errors.push(`${key} is required.`);
    }
  }

  if (consentRequired && !consentGiven) {
    errors.push("Consent is required to submit this form.");
  }

  return { valid: errors.length === 0, errors };
}
