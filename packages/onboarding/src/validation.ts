import { z } from "zod";

/**
 * Per-step input schemas. Steps that only confirm/review (`final_review`)
 * or are purely informational (`storage`) have no schema — there's
 * nothing for a person to submit.
 */

export const ownerAccountStepSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

export const studioNameStepSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
});

export const businessInfoStepSchema = z.object({
  legalBusinessName: z.string().min(2).max(160).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).default("IN"),
  businessType: z.enum(["sole_proprietor", "partnership", "pvt_ltd", "llp", "other"]).optional(),
});

export const branchStepSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const logoStepSchema = z.object({
  logoUrl: z.string().url(),
});

export const brandColorsStepSchema = z.object({
  primaryColor: z.string().min(4).max(9),
  accentColor: z.string().min(4).max(9),
});

export const gstDetailsStepSchema = z.object({
  registered: z.boolean(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/, "not a valid GSTIN")
    .optional(),
  legalName: z.string().max(160).optional(),
});

export const bankDetailsStepSchema = z.object({
  accountHolderName: z.string().min(2).max(160),
  accountNumber: z.string().min(4).max(34),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "not a valid IFSC code"),
  bankName: z.string().max(160).optional(),
});

export const upiQrStepSchema = z.object({
  upiId: z.string().regex(/^[\w.+-]+@[\w-]+$/, "not a valid UPI ID"),
});

export const emailSetupStepSchema = z.object({
  emailFromName: z.string().min(2).max(120),
  emailFromAddress: z.string().email(),
});

export const whatsappSetupStepSchema = z.object({
  whatsappNumber: z.string().min(8).max(20),
  whatsappDisplayName: z.string().min(2).max(80),
});

export const teamInvitationStepSchema = z.object({
  invitations: z
    .array(z.object({ email: z.string().email(), roleKey: z.string() }))
    .max(20)
    .default([]),
});

export const serviceItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  basePrice: z.number().int().nonnegative().optional(),
});
export const servicesStepSchema = z.object({
  services: z.array(serviceItemSchema).max(50).default([]),
});

export const packageItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.number().int().nonnegative(),
  serviceNames: z.array(z.string()).max(20).default([]),
});
export const packagesStepSchema = z.object({
  packages: z.array(packageItemSchema).max(50).default([]),
});

export const customerImportRowSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
});
export const customerImportStepSchema = z.object({
  customers: z.array(customerImportRowSchema).max(5000).default([]),
});

export const paymentGatewayStepSchema = z.object({
  provider: z.enum(["razorpay", "stripe"]),
  connected: z.boolean().default(false),
});

export const customDomainStepSchema = z.object({
  domain: z.string().min(3).max(253).optional(),
  purpose: z.enum(["studio_crm", "client_portal", "gallery", "enquiry_form", "root_website"]).optional(),
});

export const subscriptionStepSchema = z.object({
  planKey: z.enum(["starter", "professional", "business", "enterprise", "custom"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("yearly"),
});

/** Maps a step key to its schema — used by the generic `saveStep` handler so it doesn't need a switch statement per route. */
export const STEP_SCHEMAS = {
  owner_account: ownerAccountStepSchema,
  studio_name: studioNameStepSchema,
  business_info: businessInfoStepSchema,
  branch: branchStepSchema,
  logo: logoStepSchema,
  brand_colors: brandColorsStepSchema,
  gst_details: gstDetailsStepSchema,
  bank_details: bankDetailsStepSchema,
  upi_qr: upiQrStepSchema,
  email_setup: emailSetupStepSchema,
  whatsapp_setup: whatsappSetupStepSchema,
  team_invitation: teamInvitationStepSchema,
  services: servicesStepSchema,
  packages: packagesStepSchema,
  customer_import: customerImportStepSchema,
  payment_gateway: paymentGatewayStepSchema,
  custom_domain: customDomainStepSchema,
  subscription: subscriptionStepSchema,
} as const;

export type StepWithSchema = keyof typeof STEP_SCHEMAS;
