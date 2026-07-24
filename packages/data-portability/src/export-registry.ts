export const EXPORT_ENTITY_TYPES = [
  { key: "leads", label: "Leads" },
  { key: "clients", label: "Clients" },
  { key: "bookings", label: "Bookings" },
  { key: "events", label: "Events" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "galleries", label: "Galleries" },
  { key: "albums", label: "Albums" },
  { key: "audit_logs", label: "Audit logs" },
  { key: "complete_studio_data", label: "Complete studio data" },
] as const;

export type ExportEntityKey = (typeof EXPORT_ENTITY_TYPES)[number]["key"];

export function getExportEntityDefinition(key: string) {
  return EXPORT_ENTITY_TYPES.find((e) => e.key === key);
}
