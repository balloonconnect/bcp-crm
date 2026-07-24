export type QuotationStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "converted";

export interface QuotationStageDefinition {
  key: QuotationStatus;
  label: string;
  order: number;
  kind: "open" | "closed";
}

/** The 7-status pipeline named in the brief — single source of truth for status labels/order in both the backend and the studio-web quotation views. */
export const QUOTATION_STAGES: QuotationStageDefinition[] = [
  { key: "draft", label: "Draft", order: 1, kind: "open" },
  { key: "sent", label: "Sent", order: 2, kind: "open" },
  { key: "viewed", label: "Viewed", order: 3, kind: "open" },
  { key: "accepted", label: "Accepted", order: 4, kind: "open" },
  { key: "converted", label: "Converted", order: 5, kind: "closed" },
  { key: "rejected", label: "Rejected", order: 6, kind: "closed" },
  { key: "expired", label: "Expired", order: 7, kind: "closed" },
];

export const QUOTATION_STATUS_KEYS: QuotationStatus[] = QUOTATION_STAGES.map((s) => s.key);

export function getQuotationStage(status: QuotationStatus): QuotationStageDefinition {
  const stage = QUOTATION_STAGES.find((s) => s.key === status);
  if (!stage) throw new Error(`Unknown quotation status: "${status}"`);
  return stage;
}

export function isClosedQuotationStatus(status: QuotationStatus): boolean {
  return getQuotationStage(status).kind === "closed";
}

/**
 * Which status transitions are allowed — a rejected or converted
 * quotation shouldn't silently flip back to "sent," and "viewed" is a
 * system-driven transition (set when the public link is opened, see
 * apps/api's quotation-public.service.ts), not something a studio picks
 * from a dropdown.
 */
const ALLOWED_MANUAL_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  viewed: ["accepted", "rejected", "expired"],
  accepted: ["converted", "rejected"],
  rejected: [],
  expired: ["sent"], // a studio can re-send an expired quotation, resetting its validity
  converted: [],
};

export function canTransition(from: QuotationStatus, to: QuotationStatus): boolean {
  return ALLOWED_MANUAL_TRANSITIONS[from]?.includes(to) ?? false;
}
