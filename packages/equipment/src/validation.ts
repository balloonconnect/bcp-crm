import { z } from "zod";

export const equipmentInputSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(100).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().int().nonnegative().optional(),
  replacementCost: z.number().int().nonnegative().optional(),
  warrantyExpiresAt: z.string().datetime().optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  insuranceExpiresAt: z.string().datetime().optional(),
  condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]).optional(),
});
export const equipmentUpdateSchema = equipmentInputSchema.partial();

export const maintenanceRecordInputSchema = z.object({
  maintenanceType: z.enum(["routine", "cleaning", "calibration", "firmware_update", "other"]).optional(),
  performedAt: z.string().datetime(),
  description: z.string().max(2000).optional(),
  cost: z.number().int().nonnegative().optional(),
  performedBy: z.string().max(160).optional(),
  nextDueAt: z.string().datetime().optional(),
});

export const repairRecordInputSchema = z.object({
  issueDescription: z.string().min(1).max(2000),
  vendor: z.string().max(160).optional(),
  cost: z.number().int().nonnegative().optional(),
});
export const repairStatusSchema = z.object({ status: z.enum(["reported", "in_repair", "resolved", "unrepairable"]) });

export const rentalRecordInputSchema = z.object({
  direction: z.enum(["rented_out", "rented_in"]),
  counterpartyName: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  cost: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export const damageReportInputSchema = z.object({
  severity: z.enum(["minor", "moderate", "severe", "total_loss"]).optional(),
  description: z.string().min(1).max(2000),
  photoKeys: z.array(z.string()).max(20).optional(),
  repairCost: z.number().int().nonnegative().optional(),
});

export const checkoutInputSchema = z.object({
  eventId: z.string().uuid().optional(),
  expectedReturnAt: z.string().datetime().optional(),
  conditionAtCheckout: z.enum(["excellent", "good", "fair", "poor", "damaged"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const checkinInputSchema = z.object({
  conditionAtCheckin: z.enum(["excellent", "good", "fair", "poor", "damaged"]).optional(),
  notes: z.string().max(1000).optional(),
});
