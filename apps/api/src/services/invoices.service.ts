import { prisma } from "@bcp/database";
import { resolveFinancialYear, buildDocumentNumber, computeInvoiceTotals, computeOutstanding } from "@bcp/invoicing";
import { recordActivity } from "./activity-log.service";

export class InvoiceNotFoundError extends Error {
  readonly code = "INVOICE_NOT_FOUND";
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}

const invoiceInclude = { payments: { include: { receipt: true } }, installments: { orderBy: { order: "asc" as const } }, creditNotes: true, client: { select: { id: true, name: true } } };

async function nextSequenceNumber(studioId: string, prefix: string, financialYear: string, branchId?: string): Promise<number> {
  // Each document type/FY/branch combination is its own sequence — counting existing rows is enough here since invoice volume per studio per year is small and this mirrors every other "count existing, then format" numbering scheme already used across this codebase (quotations, bookings, purchase orders).
  const count = await prisma.invoice.count({ where: { studioId, financialYear, branchId: branchId ?? undefined, invoiceNumber: { startsWith: `${prefix}/` } } });
  return count + 1;
}

async function resolveBranchCode(studioId: string, branchId?: string): Promise<string | undefined> {
  if (!branchId) return undefined;
  const branch = await prisma.studioBranch.findFirst({ where: { id: branchId, studioId }, select: { name: true } });
  if (!branch) return undefined;
  return branch.name.slice(0, 3).toUpperCase();
}

const DOCUMENT_PREFIX: Record<string, string> = { proforma_invoice: "PI", tax_invoice: "INV", non_gst_invoice: "INV" };

export async function listInvoices(studioId: string, filter?: { status?: string }) {
  return prisma.invoice.findMany({ where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}) }, include: invoiceInclude, orderBy: { createdAt: "desc" } });
}

export async function getInvoice(studioId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, studioId }, include: invoiceInclude });
  if (!invoice) throw new InvoiceNotFoundError();
  return invoice;
}

export interface InvoiceInput {
  branchId?: string;
  clientId?: string;
  eventId?: string;
  quotationId?: string;
  documentType?: string;
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  isInterState?: boolean;
  gstRatePercent?: number;
  dueDate?: string;
  installments?: { label: string; dueDate: string; amount: number }[];
}

export async function createInvoice(studioId: string, input: InvoiceInput, actorId: string) {
  const documentType = input.documentType ?? "tax_invoice";
  const now = new Date();
  const financialYear = resolveFinancialYear(now);
  const prefix = DOCUMENT_PREFIX[documentType] ?? "INV";
  const branchCode = await resolveBranchCode(studioId, input.branchId);
  const sequence = await nextSequenceNumber(studioId, prefix, financialYear, input.branchId);
  const invoiceNumber = buildDocumentNumber({ prefix, financialYear, branchCode, sequence });

  const gstRatePercent = documentType === "non_gst_invoice" ? 0 : input.gstRatePercent ?? 0;
  const totals = computeInvoiceTotals({
    subtotal: input.subtotal,
    discount: input.discountType && input.discountValue !== undefined ? { type: input.discountType as "percentage" | "fixed_amount", value: input.discountValue } : null,
    gstRatePercent,
    isInterState: input.isInterState ?? false,
  });

  const invoice = await prisma.invoice.create({
    data: {
      studioId,
      branchId: input.branchId,
      clientId: input.clientId,
      eventId: input.eventId,
      quotationId: input.quotationId,
      documentType: documentType as never,
      invoiceNumber,
      financialYear,
      subtotal: totals.subtotal,
      discountType: input.discountType as never,
      discountValue: input.discountValue,
      discountAmount: totals.discountAmount,
      isInterState: input.isInterState ?? false,
      gstRatePercent,
      gstAmount: totals.gstAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      totalAmount: totals.totalAmount,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      createdBy: actorId,
      installments: input.installments?.length
        ? { create: input.installments.map((i, order) => ({ label: i.label, dueDate: new Date(i.dueDate), amount: i.amount, order })) }
        : undefined,
    },
    include: invoiceInclude,
  });

  await recordActivity({ studioId, actorId, action: "invoice.created", resourceType: "Invoice", resourceId: invoice.id, metadata: { invoiceNumber, totalAmount: invoice.totalAmount } });
  return invoice;
}

export async function updateInvoiceStatus(studioId: string, invoiceId: string, status: string, actorId: string) {
  await prisma.invoice.updateMany({ where: { id: invoiceId, studioId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "invoice.status_changed", resourceType: "Invoice", resourceId: invoiceId, metadata: { status } });
  return getInvoice(studioId, invoiceId);
}

async function nextReceiptNumber(studioId: string, financialYear: string): Promise<number> {
  const count = await prisma.receipt.count({ where: { studioId, financialYear } });
  return count + 1;
}

/**
 * Records one payment against an invoice, and — the brief's one hard
 * rule — creates its `Receipt` in the *same transaction*, never as a
 * follow-up step. The invoice's `status`/`amountPaid` are re-derived
 * from the sum of all its payments, never from a value the caller
 * passed in directly.
 */
export async function recordPayment(studioId: string, invoiceId: string, input: { amount: number; method?: string; paidAt?: string; notes?: string; gatewayProvider?: string; gatewayTransactionId?: string }, actorId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, studioId } });
  if (!invoice) throw new InvoiceNotFoundError();

  const financialYear = resolveFinancialYear(new Date());
  const receiptSequence = await nextReceiptNumber(studioId, financialYear);
  const receiptNumber = buildDocumentNumber({ prefix: "RCPT", financialYear, sequence: receiptSequence });

  const { payment, receipt } = await prisma.$transaction(async (tx: typeof prisma) => {
    const createdPayment = await tx.clientPayment.create({
      data: {
        studioId,
        invoiceId,
        amount: input.amount,
        method: (input.method as never) ?? "other",
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        notes: input.notes,
        gatewayProvider: input.gatewayProvider,
        gatewayTransactionId: input.gatewayTransactionId,
        recordedBy: actorId,
      },
    });

    const createdReceipt = await tx.receipt.create({ data: { studioId, paymentId: createdPayment.id, receiptNumber, financialYear } });

    const paidAggregate = await tx.clientPayment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
    const amountPaid = paidAggregate._sum.amount ?? 0;
    const newStatus = amountPaid >= invoice.totalAmount ? "paid" : amountPaid > 0 ? "partially_paid" : "unpaid";

    await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid, status: newStatus } });

    return { payment: createdPayment, receipt: createdReceipt };
  });

  await recordActivity({ studioId, actorId, action: "payment.recorded", resourceType: "Invoice", resourceId: invoiceId, metadata: { amount: input.amount, receiptNumber } });

  return { ...payment, receipt };
}

export async function getInvoiceOutstanding(studioId: string, invoiceId: string) {
  const invoice = await getInvoice(studioId, invoiceId);
  return { outstanding: computeOutstanding(invoice) };
}
