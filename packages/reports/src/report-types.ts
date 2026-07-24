export const REPORT_TYPES = [
  { key: "leads", label: "Leads", category: "Sales" },
  { key: "sources", label: "Sources", category: "Sales" },
  { key: "conversion", label: "Conversion", category: "Sales" },
  { key: "quotations", label: "Quotations", category: "Sales" },
  { key: "bookings", label: "Bookings", category: "Sales" },
  { key: "revenue", label: "Revenue", category: "Finance" },
  { key: "payments", label: "Payments", category: "Finance" },
  { key: "outstanding_amounts", label: "Outstanding amounts", category: "Finance" },
  { key: "expenses", label: "Expenses", category: "Finance" },
  { key: "profit", label: "Profit", category: "Finance" },
  { key: "packages", label: "Packages", category: "Catalog" },
  { key: "event_types", label: "Event types", category: "Catalog" },
  { key: "branches", label: "Branches", category: "Operations" },
  { key: "team_performance", label: "Team performance", category: "Operations" },
  { key: "freelancer_cost", label: "Freelancer cost", category: "Operations" },
  { key: "album_production", label: "Album production", category: "Production" },
  { key: "gallery_activity", label: "Gallery activity", category: "Production" },
  { key: "client_satisfaction", label: "Client satisfaction", category: "Clients" },
  { key: "referrals", label: "Referrals", category: "Clients" },
  { key: "storage", label: "Storage", category: "Platform" },
  { key: "ai_usage", label: "AI usage", category: "Platform" },
  { key: "whatsapp_usage", label: "WhatsApp usage", category: "Platform" },
] as const;

export type ReportTypeKey = (typeof REPORT_TYPES)[number]["key"];

export function getReportTypeDefinition(key: string) {
  return REPORT_TYPES.find((r) => r.key === key);
}

export function groupReportsByCategory(): Record<string, typeof REPORT_TYPES[number][]> {
  const grouped: Record<string, typeof REPORT_TYPES[number][]> = {};
  for (const report of REPORT_TYPES) {
    grouped[report.category] = grouped[report.category] ?? [];
    grouped[report.category]!.push(report);
  }
  return grouped;
}
