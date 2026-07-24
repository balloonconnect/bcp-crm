import { z } from "zod";

const installmentInputSchema = z.object({ label: z.string().min(1).max(160), dueDate: z.string().datetime(), amount: z.number().int().nonnegative() });

export const invoiceInputSchema = z.object({
  branchId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  quotationId: z.string().uuid().optional(),
  documentType: z.enum(["proforma_invoice", "tax_invoice", "non_gst_invoice"]).optional(),
  subtotal: z.number().int().nonnegative(),
  discountType: z.enum(["percentage", "fixed_amount"]).optional(),
  discountValue: z.number().nonnegative().optional(),
  isInterState: z.boolean().optional(),
  gstRatePercent: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  installments: z.array(installmentInputSchema).max(20).optional(),
});
export const invoiceUpdateSchema = invoiceInputSchema.partial();

export const paymentInputSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "razorpay", "cashfree", "other"]).optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  gatewayProvider: z.string().max(50).optional(),
  gatewayTransactionId: z.string().max(200).optional(),
});

export const creditNoteInputSchema = z.object({ amount: z.number().int().positive(), reason: z.string().max(1000).optional() });
export const refundReceiptInputSchema = z.object({
  paymentId: z.string().uuid().optional(),
  amount: z.number().int().positive(),
  reason: z.string().max(1000).optional(),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "razorpay", "cashfree", "other"]).optional(),
});
