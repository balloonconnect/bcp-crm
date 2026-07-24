/** The 8 services named in the brief ("API health," "Database health," ... "Payment provider health"), each tagged with whether it's genuinely checkable with a live network/ping call right now, or only checkable as "is it configured" — the honest distinction `apps/api`'s health-check service actually implements per service, rather than silently treating every check the same way. */
export const MONITORED_SERVICES = [
  { key: "api", label: "API", checkKind: "self" },
  { key: "database", label: "Database", checkKind: "live_ping" },
  { key: "redis", label: "Redis", checkKind: "live_ping" },
  { key: "storage", label: "Storage", checkKind: "live_ping" },
  { key: "ai_provider", label: "AI provider", checkKind: "configuration_only" },
  { key: "whatsapp", label: "WhatsApp", checkKind: "configuration_only" },
  { key: "payment_provider", label: "Payment provider", checkKind: "configuration_only" },
  { key: "queue", label: "Queue", checkKind: "live_ping" },
] as const;

export type MonitoredServiceKey = (typeof MONITORED_SERVICES)[number]["key"];

export function getServiceDefinition(key: string) {
  return MONITORED_SERVICES.find((s) => s.key === key);
}
