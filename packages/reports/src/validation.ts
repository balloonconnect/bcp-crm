import { z } from "zod";

const reportTypeEnum = z.enum(["leads", "sources", "conversion", "quotations", "bookings", "revenue", "payments", "outstanding_amounts", "expenses", "profit", "packages", "event_types", "branches", "team_performance", "freelancer_cost", "album_production", "gallery_activity", "client_satisfaction", "referrals", "storage", "ai_usage", "whatsapp_usage"]);

export const reportFilterSchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  branchId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const runReportSchema = z.object({ reportType: reportTypeEnum, filters: reportFilterSchema.optional() });

export const saveReportSchema = z.object({ reportType: reportTypeEnum, name: z.string().min(1).max(200), filters: reportFilterSchema.optional() });

export const scheduleReportSchema = z.object({ savedReportId: z.string().uuid(), frequency: z.enum(["daily", "weekly", "monthly"]), recipientEmails: z.array(z.string().email()).min(1).max(20) });
