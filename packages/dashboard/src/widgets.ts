export type WidgetKey =
  | "todays_shoots"
  | "upcoming_events"
  | "new_enquiries"
  | "follow_ups_due"
  | "pending_quotations"
  | "confirmed_bookings"
  | "pending_payments"
  | "overdue_payments"
  | "editing_pending"
  | "album_selection_pending"
  | "printing_pending"
  | "gallery_delivery_pending"
  | "storage_usage"
  | "monthly_revenue"
  | "monthly_expense"
  | "estimated_profit"
  | "team_availability"
  | "recent_activity"
  | "ai_recommendations";

export type WidgetCategory = "today" | "pipeline" | "finance" | "production" | "operations" | "insights";

export interface WidgetDefinition {
  key: WidgetKey;
  title: string;
  description: string;
  category: WidgetCategory;
  /** Default display order (lower = earlier) — also mobile's default priority order, since mobile stacks widgets one per row in this sequence unless a person has reordered them. */
  defaultOrder: number;
}

/**
 * The 19 dashboard widgets — single source of truth the dashboard UI,
 * the layout-customization panel, and the summary API's response shape
 * all key off of. Default order roughly follows "what needs my
 * attention today" → "what's coming up" → "money" → "production
 * pipeline" → "broader context," not an arbitrary grid position.
 */
export const WIDGET_REGISTRY: WidgetDefinition[] = [
  { key: "todays_shoots", title: "Today's shoots", description: "Shoots scheduled for today, with assigned team.", category: "today", defaultOrder: 1 },
  { key: "new_enquiries", title: "New enquiries", description: "Leads that haven't been contacted yet.", category: "pipeline", defaultOrder: 2 },
  { key: "follow_ups_due", title: "Follow-ups due", description: "Leads with a follow-up date today or overdue.", category: "pipeline", defaultOrder: 3 },
  { key: "overdue_payments", title: "Overdue payments", description: "Invoices past their due date with a balance owing.", category: "finance", defaultOrder: 4 },
  { key: "upcoming_events", title: "Upcoming events", description: "Confirmed shoots in the next 7 days.", category: "today", defaultOrder: 5 },
  { key: "pending_quotations", title: "Pending quotations", description: "Quotations sent but not yet accepted or rejected.", category: "pipeline", defaultOrder: 6 },
  { key: "confirmed_bookings", title: "Confirmed bookings", description: "Events confirmed but not yet completed.", category: "pipeline", defaultOrder: 7 },
  { key: "pending_payments", title: "Pending payments", description: "Invoices with a balance still owing (not yet overdue).", category: "finance", defaultOrder: 8 },
  { key: "editing_pending", title: "Editing pending", description: "Completed shoots still awaiting editing.", category: "production", defaultOrder: 9 },
  { key: "album_selection_pending", title: "Album selection pending", description: "Albums waiting on a client's photo selection.", category: "production", defaultOrder: 10 },
  { key: "printing_pending", title: "Printing pending", description: "Albums approved and awaiting print.", category: "production", defaultOrder: 11 },
  { key: "gallery_delivery_pending", title: "Gallery delivery pending", description: "Galleries uploaded but not yet delivered to the client.", category: "production", defaultOrder: 12 },
  { key: "monthly_revenue", title: "Monthly revenue", description: "Payments collected so far this month.", category: "finance", defaultOrder: 13 },
  { key: "monthly_expense", title: "Monthly expense", description: "Expenses logged so far this month.", category: "finance", defaultOrder: 14 },
  { key: "estimated_profit", title: "Estimated profit", description: "This month's revenue minus logged expenses.", category: "finance", defaultOrder: 15 },
  { key: "team_availability", title: "Team availability", description: "Who's booked on a shoot today vs. free.", category: "operations", defaultOrder: 16 },
  { key: "storage_usage", title: "Storage usage", description: "Storage used against your plan's allowance.", category: "operations", defaultOrder: 17 },
  { key: "recent_activity", title: "Recent activity", description: "The latest actions taken across your studio.", category: "insights", defaultOrder: 18 },
  { key: "ai_recommendations", title: "AI recommendations", description: "Suggested next actions based on what's outstanding.", category: "insights", defaultOrder: 19 },
];

export const TOTAL_WIDGETS = WIDGET_REGISTRY.length;

export function getWidgetDefinition(key: WidgetKey): WidgetDefinition {
  const widget = WIDGET_REGISTRY.find((w) => w.key === key);
  if (!widget) throw new Error(`Unknown dashboard widget: "${key}"`);
  return widget;
}

export const WIDGET_KEYS: WidgetKey[] = WIDGET_REGISTRY.map((w) => w.key);
