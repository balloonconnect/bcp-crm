export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "meeting_scheduled"
  | "quotation_sent"
  | "negotiation"
  | "booking_pending"
  | "won"
  | "lost";

export interface PipelineStage {
  key: LeadStatus;
  label: string;
  order: number;
  /** "open" stages are still active in the pipeline; "closed" stages (won/lost) are terminal — used to decide e.g. whether a follow-up reminder still makes sense. */
  kind: "open" | "closed";
}

/**
 * The 9-stage pipeline — single source of truth for the kanban board's
 * columns, the table/card views' status labels, and backend status
 * validation. `order` is the kanban column order and the only place
 * "what comes after what" is encoded — the AI win-probability heuristic
 * and the follow-up-due dashboard widget both read stage order from
 * here rather than hardcoding a second copy of the sequence.
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "new", label: "New", order: 1, kind: "open" },
  { key: "contacted", label: "Contacted", order: 2, kind: "open" },
  { key: "qualified", label: "Qualified", order: 3, kind: "open" },
  { key: "meeting_scheduled", label: "Meeting scheduled", order: 4, kind: "open" },
  { key: "quotation_sent", label: "Quotation sent", order: 5, kind: "open" },
  { key: "negotiation", label: "Negotiation", order: 6, kind: "open" },
  { key: "booking_pending", label: "Booking pending", order: 7, kind: "open" },
  { key: "won", label: "Won", order: 8, kind: "closed" },
  { key: "lost", label: "Lost", order: 9, kind: "closed" },
];

export const LEAD_STATUS_KEYS: LeadStatus[] = PIPELINE_STAGES.map((s) => s.key);

export function getPipelineStage(status: LeadStatus): PipelineStage {
  const stage = PIPELINE_STAGES.find((s) => s.key === status);
  if (!stage) throw new Error(`Unknown lead status: "${status}"`);
  return stage;
}

export function isClosedStage(status: LeadStatus): boolean {
  return getPipelineStage(status).kind === "closed";
}

export type LeadPriority = "low" | "medium" | "high" | "urgent";
export const LEAD_PRIORITIES: { key: LeadPriority; label: string; weight: number }[] = [
  { key: "low", label: "Low", weight: 1 },
  { key: "medium", label: "Medium", weight: 2 },
  { key: "high", label: "High", weight: 3 },
  { key: "urgent", label: "Urgent", weight: 4 },
];

export type LeadSource = "website" | "referral" | "instagram" | "whatsapp" | "walk_in" | "other";
export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "referral", label: "Referral" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "walk_in", label: "Walk-in" },
  { key: "other", label: "Other" },
];

export const LOST_REASONS = [
  "Budget mismatch",
  "Booked with another studio",
  "Date unavailable",
  "Went unresponsive",
  "Postponed indefinitely",
  "Other",
] as const;
