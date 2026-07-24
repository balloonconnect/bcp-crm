import { prisma } from "@bcp/database";
import { computeVendorBillTotal } from "@bcp/finance";
import { recordActivity } from "./activity-log.service";

export class PurchaseOrderNotFoundError extends Error {
  readonly code = "PURCHASE_ORDER_NOT_FOUND";
  constructor() {
    super("Purchase order not found");
    this.name = "PurchaseOrderNotFoundError";
  }
}
export class VendorBillNotFoundError extends Error {
  readonly code = "VENDOR_BILL_NOT_FOUND";
  constructor() {
    super("Vendor bill not found");
    this.name = "VendorBillNotFoundError";
  }
}

async function nextPoNumber(studioId: string): Promise<string> {
  const count = await prisma.purchaseOrder.count({ where: { studioId } });
  const year = new Date().getFullYear();
  return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ── Purchase orders ──────────────────────────────────────────────────

export async function listPurchaseOrders(studioId: string, vendorId?: string) {
  return prisma.purchaseOrder.findMany({ where: { studioId, ...(vendorId ? { vendorId } : {}) }, include: { vendor: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
}

export async function createPurchaseOrder(studioId: string, input: { vendorId: string; description: string; amount: number; expectedDeliveryDate?: string }, actorId: string) {
  const poNumber = await nextPoNumber(studioId);
  const po = await prisma.purchaseOrder.create({
    data: { studioId, vendorId: input.vendorId, poNumber, description: input.description, amount: input.amount, expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined, createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "purchase_order.created", resourceType: "PurchaseOrder", resourceId: po.id, metadata: { poNumber } });
  return po;
}

export async function updatePurchaseOrderStatus(studioId: string, poId: string, status: string, actorId: string) {
  await prisma.purchaseOrder.updateMany({ where: { id: poId, studioId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "purchase_order.status_changed", resourceType: "PurchaseOrder", resourceId: poId, metadata: { status } });
  return prisma.purchaseOrder.findUnique({ where: { id: poId } });
}

// ── Vendor bills ─────────────────────────────────────────────────────

export async function listVendorBills(studioId: string, filter?: { vendorId?: string; status?: string }) {
  return prisma.vendorBill.findMany({
    where: { studioId, ...(filter?.vendorId ? { vendorId: filter.vendorId } : {}), ...(filter?.status ? { status: filter.status as never } : {}) },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { billDate: "desc" },
  });
}

export async function createVendorBill(studioId: string, input: { vendorId: string; purchaseOrderId?: string; billNumber: string; billDate: string; dueDate?: string; amount: number; gstAmount?: number; tdsAmount?: number; notes?: string }, actorId: string) {
  const gstAmount = input.gstAmount ?? 0;
  const tdsAmount = input.tdsAmount ?? 0;
  const totalAmount = computeVendorBillTotal(input.amount, gstAmount, tdsAmount);

  const bill = await prisma.vendorBill.create({
    data: {
      studioId,
      vendorId: input.vendorId,
      purchaseOrderId: input.purchaseOrderId,
      billNumber: input.billNumber,
      billDate: new Date(input.billDate),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      amount: input.amount,
      gstAmount,
      tdsAmount,
      totalAmount,
      notes: input.notes,
      createdBy: actorId,
    },
  });

  await recordActivity({ studioId, actorId, action: "vendor_bill.created", resourceType: "VendorBill", resourceId: bill.id, metadata: { billNumber: input.billNumber, totalAmount } });
  return bill;
}

export async function recordVendorBillPayment(studioId: string, billId: string, amount: number, actorId: string) {
  const bill = await prisma.vendorBill.findFirst({ where: { id: billId, studioId } });
  if (!bill) throw new VendorBillNotFoundError();

  const newAmountPaid = bill.amountPaid + amount;
  const status = newAmountPaid >= bill.totalAmount ? "paid" : "partially_paid";

  await prisma.vendorBill.updateMany({ where: { id: billId, studioId }, data: { amountPaid: newAmountPaid, status } });
  await recordActivity({ studioId, actorId, action: "vendor_bill.payment_recorded", resourceType: "VendorBill", resourceId: billId, metadata: { amount } });
  return prisma.vendorBill.findUnique({ where: { id: billId } });
}
