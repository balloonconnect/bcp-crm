import { z } from "zod";

export const teamProfileInputSchema = z.object({
  employmentType: z.enum(["employee", "freelancer"]).optional(),
  skills: z.array(z.string().min(1).max(60)).max(30).optional(),
  availabilityStatus: z.enum(["available", "busy", "on_leave", "unavailable"]).optional(),
  salaryAmount: z.number().int().nonnegative().optional(),
  freelancerRateAmount: z.number().int().nonnegative().optional(),
  freelancerRateUnit: z.enum(["per_day", "per_event", "per_hour"]).optional(),
  paymentTerms: z.string().max(1000).optional(),
  bankAccountName: z.string().max(160).optional(),
  bankAccountNumber: z.string().max(40).optional(),
  bankIfscCode: z.string().max(20).optional(),
  bankName: z.string().max(160).optional(),
  emergencyContactName: z.string().max(160).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
});

export const teamDocumentInputSchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z.enum(["contract", "id_proof", "certification", "other"]).optional(),
  fileKey: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

export const teamEquipmentAssignmentSchema = z.object({ equipmentId: z.string().uuid(), notes: z.string().max(500).optional() });

export const attendanceInputSchema = z.object({
  date: z.string().datetime(),
  status: z.enum(["present", "absent", "half_day", "leave", "holiday"]).optional(),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const leaveRequestInputSchema = z.object({
  leaveType: z.enum(["sick", "casual", "paid", "unpaid", "other"]).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(1000).optional(),
});

export const leaveDecisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

export const performanceNoteInputSchema = z.object({
  periodLabel: z.string().min(1).max(100),
  ratingScore: z.number().int().min(1).max(5).optional(),
  note: z.string().max(3000).optional(),
});

export const freelancerPaymentInputSchema = z.object({
  eventId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  amount: z.number().int().positive(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const freelancerPaymentStatusSchema = z.object({ status: z.enum(["pending", "paid", "cancelled"]) });
