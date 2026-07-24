import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  vendorInputSchema,
  vendorUpdateSchema,
  costCentreInputSchema,
  purchaseOrderInputSchema,
  purchaseOrderStatusSchema,
  vendorBillInputSchema,
  vendorBillPaymentSchema,
  expenseInputSchema,
  expenseUpdateSchema,
  expenseApprovalSchema,
  expensePaymentStatusSchema,
} from "@bcp/finance";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as vendors from "../services/vendors.service";
import * as vendorTransactions from "../services/vendor-transactions.service";
import * as expenses from "../services/expenses.service";
import * as profit from "../services/profit.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function financeRoutes(app: FastifyInstance) {
  const viewVendor = [app.authenticate, requireStudioPermission("vendor:view")];
  const manageVendor = [app.authenticate, requireStudioPermission("vendor:manage")];
  const viewExpense = [app.authenticate, requireStudioPermission("expense:view")];
  const manageExpense = [app.authenticate, requireStudioPermission("expense:manage")];

  // ── Vendors ──────────────────────────────────────────────────────────
  app.get("/vendors", { preHandler: viewVendor }, async (request) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await vendors.listVendors(request.auth!.studioId!, includeInactive) };
  });

  app.get("/vendors/:id", { preHandler: viewVendor }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await vendors.getVendor(request.auth!.studioId!, id) };
  });

  app.post("/vendors", { preHandler: manageVendor }, async (request) => {
    const body = vendorInputSchema.parse(request.body);
    return { ok: true, data: await vendors.createVendor(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/vendors/:id", { preHandler: manageVendor }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = vendorUpdateSchema.parse(request.body);
    return { ok: true, data: await vendors.updateVendor(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/vendors/:id", { preHandler: manageVendor }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await vendors.deactivateVendor(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Cost centres ─────────────────────────────────────────────────────
  app.get("/cost-centres", { preHandler: viewExpense }, async (request) => ({ ok: true, data: await vendors.listCostCentres(request.auth!.studioId!) }));

  app.post("/cost-centres", { preHandler: manageExpense }, async (request) => {
    const body = costCentreInputSchema.parse(request.body);
    return { ok: true, data: await vendors.createCostCentre(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  // ── Purchase orders ──────────────────────────────────────────────────
  app.get("/purchase-orders", { preHandler: viewVendor }, async (request) => {
    const { vendorId } = z.object({ vendorId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await vendorTransactions.listPurchaseOrders(request.auth!.studioId!, vendorId) };
  });

  app.post("/purchase-orders", { preHandler: manageVendor }, async (request) => {
    const body = purchaseOrderInputSchema.parse(request.body);
    return { ok: true, data: await vendorTransactions.createPurchaseOrder(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/purchase-orders/:id/status", { preHandler: manageVendor }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = purchaseOrderStatusSchema.parse(request.body);
    return { ok: true, data: await vendorTransactions.updatePurchaseOrderStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  // ── Vendor bills ─────────────────────────────────────────────────────
  app.get("/vendor-bills", { preHandler: viewVendor }, async (request) => {
    const query = z.object({ vendorId: z.string().uuid().optional(), status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await vendorTransactions.listVendorBills(request.auth!.studioId!, query) };
  });

  app.post("/vendor-bills", { preHandler: manageVendor }, async (request) => {
    const body = vendorBillInputSchema.parse(request.body);
    return { ok: true, data: await vendorTransactions.createVendorBill(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/vendor-bills/:id/payments", { preHandler: manageVendor }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { amount } = vendorBillPaymentSchema.parse(request.body);
    return { ok: true, data: await vendorTransactions.recordVendorBillPayment(request.auth!.studioId!, id, amount, request.auth!.actorId) };
  });

  // ── Expenses ─────────────────────────────────────────────────────────
  app.get("/expenses", { preHandler: viewExpense }, async (request) => {
    const query = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), eventId: z.string().uuid().optional(), approvalStatus: z.string().optional() }).parse(request.query);
    return {
      ok: true,
      data: await expenses.listExpenses(request.auth!.studioId!, { from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined, eventId: query.eventId, approvalStatus: query.approvalStatus }),
    };
  });

  app.get("/expenses/:id", { preHandler: viewExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await expenses.getExpense(request.auth!.studioId!, id) };
  });

  app.post("/expenses", { preHandler: manageExpense }, async (request) => {
    const { requireApproval, ...body } = z.object({ requireApproval: z.boolean().optional() }).and(expenseInputSchema).parse(request.body);
    return { ok: true, data: await expenses.createExpense(request.auth!.studioId!, body, request.auth!.actorId, requireApproval) };
  });

  app.patch("/expenses/:id", { preHandler: manageExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = expenseUpdateSchema.parse(request.body);
    return { ok: true, data: await expenses.updateExpense(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.post("/expenses/:id/approval", { preHandler: manageExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { decision } = expenseApprovalSchema.parse(request.body);
    return { ok: true, data: await expenses.decideExpenseApproval(request.auth!.studioId!, id, decision, request.auth!.actorId) };
  });

  app.patch("/expenses/:id/payment-status", { preHandler: manageExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = expensePaymentStatusSchema.parse(request.body);
    return { ok: true, data: await expenses.updateExpensePaymentStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.post("/expenses/:id/spawn-next", { preHandler: manageExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await expenses.spawnNextRecurringExpense(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Profit & financial summary ───────────────────────────────────────
  app.get("/events/:id/profit", { preHandler: viewExpense }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await profit.getEventProfit(request.auth!.studioId!, id) };
  });

  app.get("/finance/summary", { preHandler: viewExpense }, async (request) => {
    const query = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() }).parse(request.query);
    return { ok: true, data: await profit.getStudioFinancialSummary(request.auth!.studioId!, { from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined }) };
  });
}
