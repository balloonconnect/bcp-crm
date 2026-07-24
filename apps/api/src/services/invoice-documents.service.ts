import { prisma } from "@bcp/database";
import { resolveFinancialYear, buildDocumentNumber } from "@bcp/invoicing";
import { recordActivity } from "./activity-log.service";
import { InvoiceNotFoundError } from "./invoices.service";

async function nextNumber(studioId: string, model: "creditNote" | "refundReceipt", financialYear: string): Promise<number> {
  const count = model === "creditNote" ? await prisma.creditNote.count({ where: { studioId, financialYear } }) : await prisma.refundReceipt.count({ where: { studioId, financialYear } });
  return count + 1;
}

export async function createCreditNote(studioId: string, invoiceId: string, input: { amount: number; reason?: string }, actorId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, studioId } });
  if (!invoice) throw new InvoiceNotFoundError();

  const financialYear = resolveFinancialYear(new Date());
  const sequence = await nextNumber(studioId, "creditNote", financialYear);
  const creditNoteNumber = buildDocumentNumber({ prefix: "CN", financialYear, sequence });

  const creditNote = await prisma.creditNote.create({ data: { studioId, invoiceId, creditNoteNumber, financialYear, amount: input.amount, reason: input.reason, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "credit_note.issued", resourceType: "Invoice", resourceId: invoiceId, metadata: { creditNoteNumber, amount: input.amount } });
  return creditNote;
}

export async function applyCreditNote(studioId: string, creditNoteId: string, actorId: string) {
  const creditNote = await prisma.creditNote.findFirst({ where: { id: creditNoteId, studioId } });
  if (!creditNote) throw new InvoiceNotFoundError();

  await prisma.$transaction([
    prisma.creditNote.update({ where: { id: creditNoteId }, data: { status: "applied" } }),
    prisma.invoice.update({ where: { id: creditNote.invoiceId }, data: { totalAmount: { decrement: creditNote.amount } } }),
  ]);

  await recordActivity({ studioId, actorId, action: "credit_note.applied", resourceType: "CreditNote", resourceId: creditNoteId });
  return prisma.creditNote.findUnique({ where: { id: creditNoteId } });
}

export async function createRefundReceipt(studioId: string, input: { paymentId?: string; amount: number; reason?: string; method?: string }, actorId: string) {
  const financialYear = resolveFinancialYear(new Date());
  const sequence = await nextNumber(studioId, "refundReceipt", financialYear);
  const refundReceiptNumber = buildDocumentNumber({ prefix: "RFD", financialYear, sequence });

  const refund = await prisma.refundReceipt.create({
    data: { studioId, paymentId: input.paymentId, refundReceiptNumber, financialYear, amount: input.amount, reason: input.reason, method: (input.method as never) ?? "other", createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "refund_receipt.issued", resourceType: "RefundReceipt", resourceId: refund.id, metadata: { refundReceiptNumber, amount: input.amount } });
  return refund;
}

export async function listCreditNotes(studioId: string, invoiceId?: string) {
  return prisma.creditNote.findMany({ where: { studioId, ...(invoiceId ? { invoiceId } : {}) }, orderBy: { issuedAt: "desc" } });
}

export async function listRefundReceipts(studioId: string) {
  return prisma.refundReceipt.findMany({ where: { studioId }, orderBy: { refundedAt: "desc" } });
}
