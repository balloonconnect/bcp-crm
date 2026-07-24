import { z } from "zod";

export const vendorInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  contactPersonName: z.string().max(160).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().max(500).optional(),
  gstin: z.string().max(20).optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});
export const vendorUpdateSchema = vendorInputSchema.partial();

export const costCentreInputSchema = z.object({ name: z.string().min(1).max(160), description: z.string().max(1000).optional() });

export const purchaseOrderInputSchema = z.object({
  vendorId: z.string().uuid(),
  description: z.string().min(1).max(2000),
  amount: z.number().int().nonnegative(),
  expectedDeliveryDate: z.string().datetime().optional(),
});
export const purchaseOrderStatusSchema = z.object({ status: z.enum(["draft", "sent", "fulfilled", "cancelled"]) });

export const vendorBillInputSchema = z.object({
  vendorId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional(),
  billNumber: z.string().min(1).max(100),
  billDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  amount: z.number().int().nonnegative(),
  gstAmount: z.number().int().nonnegative().optional(),
  tdsAmount: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});
export const vendorBillStatusSchema = z.object({ status: z.enum(["unpaid", "partially_paid", "paid", "overdue"]) });
export const vendorBillPaymentSchema = z.object({ amount: z.number().int().positive() });

export const expenseInputSchema = z.object({
  branchId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  costCentreId: z.string().uuid().optional(),
  category: z.enum(["equipment", "rent", "salaries", "marketing", "travel", "printing", "other"]),
  amount: z.number().int().nonnegative(),
  gstAmount: z.number().int().nonnegative().optional(),
  tdsAmount: z.number().int().nonnegative().optional(),
  incurredOn: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  receiptFileKey: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceInterval: z.number().int().positive().optional(),
});
export const expenseUpdateSchema = expenseInputSchema.partial();

export const expenseApprovalSchema = z.object({ decision: z.enum(["approved", "rejected"]) });
export const expensePaymentStatusSchema = z.object({ status: z.enum(["unpaid", "partially_paid", "paid"]) });
