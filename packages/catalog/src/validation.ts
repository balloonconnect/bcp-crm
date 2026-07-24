import { z } from "zod";

export const serviceInputSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.enum(["photography", "videography", "aerial_and_specialty", "streaming_and_display", "print_and_album", "post_production", "logistics", "styling"]),
  description: z.string().max(2000).optional(),
  internalPrice: z.number().int().nonnegative(),
  unit: z.enum(["per_event", "per_hour", "per_day", "per_item"]).optional(),
  isActive: z.boolean().optional(),
});

export const serviceUpdateSchema = serviceInputSchema.partial();

export const packageServiceInputSchema = z.object({ serviceId: z.string().uuid(), quantity: z.number().int().positive().default(1) });
export const packageAddOnInputSchema = z.object({ name: z.string().min(1).max(160), price: z.number().int().nonnegative(), description: z.string().max(1000).optional() });
export const paymentScheduleItemInputSchema = z.object({
  label: z.string().min(1).max(160),
  percentage: z.number().min(0).max(100),
  trigger: z.enum(["on_booking", "before_event", "on_event_day", "on_delivery", "custom_days_before_event", "custom_days_after_event"]).optional(),
  customDays: z.number().int().nonnegative().optional(),
});

export const packageInputSchema = z.object({
  name: z.string().min(1).max(160),
  eventType: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  customerFacingTotal: z.number().int().nonnegative(),
  itemLevelPricingEnabled: z.boolean().optional(),
  durationLabel: z.string().max(100).optional(),
  teamRequirement: z.string().max(200).optional(),
  deliverables: z.array(z.string().min(1).max(200)).max(50).optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
  discountAllowed: z.boolean().optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  termsText: z.string().max(5000).optional(),
  isActive: z.boolean().optional(),
  services: z.array(packageServiceInputSchema).max(50).optional(),
  addOns: z.array(packageAddOnInputSchema).max(50).optional(),
  paymentSchedule: z.array(paymentScheduleItemInputSchema).max(20).optional(),
});

export const packageUpdateSchema = packageInputSchema.partial();

/** A payment schedule that doesn't sum to (approximately) 100% is a real authoring mistake worth catching before it reaches a customer — floating-point tolerance of 0.5 to allow for reasonable split rounding (e.g. 33.33/33.33/33.34). */
export function validatePaymentScheduleTotal(items: { percentage: number }[]): { valid: boolean; total: number } {
  const total = items.reduce((sum, item) => sum + item.percentage, 0);
  return { valid: items.length === 0 || Math.abs(total - 100) <= 0.5, total };
}
