export type ToolKind = "read" | "write";

export interface CopilotToolDefinition {
  name: string;
  description: string;
  kind: ToolKind;
  requiredPermission: string; // an @bcp/permissions key — the copilot can never call a tool the acting user's own role doesn't already grant
  isReversible: boolean; // only meaningful for "write" tools
  buildPhase: 1 | 2 | 3; // the minimum build phase (see @bcp/copilot's phases.ts) this tool is available at
  inputSchema: Record<string, unknown>; // JSON schema handed to Claude as the tool's input_schema
}

/**
 * Every tool the copilot can call, one per example query in the
 * brief — deliberately a fixed, named registry rather than letting
 * the model construct arbitrary queries: a tool call can only ever do
 * what its own hand-written implementation (in `apps/api`'s
 * `copilot-tools.service.ts`) does, scoped to whatever `studioId` the
 * calling code injects. No tool here accepts a `studioId` parameter —
 * that's the load-bearing half of "never allow cross-tenant AI
 * context": the model literally cannot supply one.
 */
export const COPILOT_TOOLS: CopilotToolDefinition[] = [
  {
    name: "list_events",
    description: "List the studio's events in a date range, e.g. tomorrow's events or this week's shoots.",
    kind: "read",
    requiredPermission: "event:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: { fromDate: { type: "string", format: "date" }, toDate: { type: "string", format: "date" } }, required: ["fromDate", "toDate"] },
  },
  {
    name: "list_overdue_invoices",
    description: "List invoices that are overdue or unpaid past their due date.",
    kind: "read",
    requiredPermission: "invoice:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_pending_album_selections",
    description: "List clients/albums where photo selection hasn't been submitted yet.",
    kind: "read",
    requiredPermission: "album:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_client_summary",
    description: "Summarize one client: their bookings, events, financial status, and recent activity.",
    kind: "read",
    requiredPermission: "client:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: { clientId: { type: "string", format: "uuid" } }, required: ["clientId"] },
  },
  {
    name: "get_editor_workload",
    description: "Show each team member's current editing workload, to identify who is overloaded.",
    kind: "read",
    requiredPermission: "team:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "forecast_revenue",
    description: "Forecast this month's (or a given month's) revenue from confirmed bookings and outstanding invoices.",
    kind: "read",
    requiredPermission: "invoice:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: { month: { type: "string", description: "YYYY-MM" } } },
  },
  {
    name: "list_low_profit_events",
    description: "List events whose profit margin (revenue minus expenses) is below a threshold.",
    kind: "read",
    requiredPermission: "expense:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: { thresholdPercent: { type: "number" } } },
  },
  {
    name: "suggest_package",
    description: "Suggest a service package for a lead/enquiry based on its stated requirements.",
    kind: "read",
    requiredPermission: "lead:view",
    isReversible: false,
    buildPhase: 1,
    inputSchema: { type: "object", properties: { leadId: { type: "string", format: "uuid" } }, required: ["leadId"] },
  },
  {
    name: "create_quotation",
    description: "Draft a new quotation for a client.",
    kind: "write",
    requiredPermission: "quotation:manage",
    isReversible: true, // reversed by voiding the quotation
    buildPhase: 2,
    inputSchema: { type: "object", properties: { clientId: { type: "string", format: "uuid" }, lineItems: { type: "array" } }, required: ["clientId", "lineItems"] },
  },
  {
    name: "draft_payment_reminder",
    description: "Draft a payment reminder message for an overdue invoice, for a human to review and send.",
    kind: "write",
    requiredPermission: "invoice:view",
    isReversible: true, // a draft that's never sent has nothing to reverse; still marked reversible since deleting the draft is always safe
    buildPhase: 2,
    inputSchema: { type: "object", properties: { invoiceId: { type: "string", format: "uuid" } }, required: ["invoiceId"] },
  },
  {
    name: "create_shot_list",
    description: "Create a shot list for an event (e.g. a wedding shot list) from a standard template.",
    kind: "write",
    requiredPermission: "event:manage",
    isReversible: true, // reversed by deleting the created shot list items
    buildPhase: 3,
    inputSchema: { type: "object", properties: { eventId: { type: "string", format: "uuid" }, eventType: { type: "string" } }, required: ["eventId"] },
  },
];

export function getToolDefinition(name: string): CopilotToolDefinition | undefined {
  return COPILOT_TOOLS.find((t) => t.name === name);
}

export function getToolsForPhase(phase: 1 | 2 | 3): CopilotToolDefinition[] {
  return COPILOT_TOOLS.filter((t) => t.buildPhase <= phase);
}
