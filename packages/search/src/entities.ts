/**
 * The 13 searchable entities named in the brief, each tagged with the
 * permission required to see results of that type — "Permission
 * filtering" starts here: `apps/api`'s search orchestration only ever
 * queries entity types the acting user's own granted permissions
 * allow, the same "the search results a user sees are exactly what
 * they could already navigate to" guarantee the AI Studio Copilot's
 * tool gating (Prompt 36) already established for a different
 * feature. `quickActionLabel` is what powers "Quick actions" — a
 * command-menu entry offered alongside matching results, not a
 * separate feature bolted on afterward.
 */
export const SEARCHABLE_ENTITIES = [
  { key: "lead", label: "Leads", requiredPermission: "lead:view", quickActionLabel: "New lead" },
  { key: "client", label: "Clients", requiredPermission: "client:view", quickActionLabel: "New client" },
  { key: "event", label: "Events", requiredPermission: "shoot:view", quickActionLabel: null },
  { key: "booking", label: "Bookings", requiredPermission: "booking:view", quickActionLabel: null },
  { key: "quotation", label: "Quotations", requiredPermission: "quotation:view", quickActionLabel: "New quotation" },
  { key: "invoice", label: "Invoices", requiredPermission: "invoice:view", quickActionLabel: null },
  { key: "payment", label: "Payments", requiredPermission: "payment:view", quickActionLabel: null },
  { key: "task", label: "Tasks", requiredPermission: "task:view", quickActionLabel: "New task" },
  { key: "gallery", label: "Galleries", requiredPermission: "gallery:view", quickActionLabel: null },
  { key: "album", label: "Albums", requiredPermission: "album:view", quickActionLabel: null },
  { key: "team", label: "Team", requiredPermission: "team:view", quickActionLabel: null },
  { key: "vendor", label: "Vendors", requiredPermission: "vendor:view", quickActionLabel: null },
  { key: "equipment", label: "Equipment", requiredPermission: "equipment:view", quickActionLabel: null },
] as const;

export type SearchableEntityKey = (typeof SEARCHABLE_ENTITIES)[number]["key"];

export function getEntityDefinition(key: string) {
  return SEARCHABLE_ENTITIES.find((e) => e.key === key);
}

/** "Permission filtering" as a pure function — the entity types a user with a given permission set is even allowed to search across. */
export function resolveSearchableEntities(grantedPermissions: string[]): SearchableEntityKey[] {
  return SEARCHABLE_ENTITIES.filter((e) => grantedPermissions.includes(e.requiredPermission)).map((e) => e.key);
}
