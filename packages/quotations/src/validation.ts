import { z } from "zod";
import { QUOTATION_STATUS_KEYS } from "./pipeline";

const lineItemInputSchema = z.object({
  kind: z.enum(["service", "add_on"]).default("service"),
  serviceId: z.string().uuid().optional(), // present for kind=service, used to snapshot internalPrice server-side
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().int().nonnegative(),
});

const paymentScheduleInputSchema = z.object({
  label: z.string().min(1).max(160),
  percentage: z.number().min(0).max(100),
  trigger: z.enum(["on_booking", "before_event", "on_event_day", "on_delivery", "custom_days_before_event", "custom_days_after_event"]).optional(),
});

export const quotationInputSchema = z.object({
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  lineItems: z.array(lineItemInputSchema).max(100).default([]),
  discountType: z.enum(["percentage", "fixed_amount"]).optional(),
  discountValue: z.number().nonnegative().optional(),
  gstRatePercent: z.number().min(0).max(100).optional(),
  itemLevelPricingEnabled: z.boolean().optional(),
  termsText: z.string().max(5000).optional(),
  validUntil: z.string().datetime().optional(),
  paymentSchedule: z.array(paymentScheduleInputSchema).max(20).optional(),
});

export const quotationUpdateSchema = quotationInputSchema.partial();

export const quotationStatusChangeSchema = z.object({ status: z.enum(QUOTATION_STATUS_KEYS as [string, ...string[]]) });

export const otpRequestSchema = z.object({ target: z.string().min(3).max(200) }); // email or phone
export const otpVerifySchema = z.object({ target: z.string().min(3).max(200), code: z.string().length(6) });

export const approvalSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
  signedByName: z.string().min(1).max(160).optional(),
  rejectionReason: z.string().max(1000).optional(),
});
