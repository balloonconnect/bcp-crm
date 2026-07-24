export type TimelineEventType =
  | "enquiry"
  | "call"
  | "message"
  | "meeting"
  | "quotation"
  | "booking"
  | "event"
  | "contract"
  | "invoice"
  | "payment"
  | "gallery"
  | "album_selection"
  | "print_order"
  | "delivery"
  | "feedback";

export interface TimelineEventTypeDefinition {
  key: TimelineEventType;
  label: string;
  /** Which underlying source this is drawn from — mostly a documentation aid for the aggregation service, since several types share one source table distinguished by a field (e.g. "call"/"message"/"meeting" all come from ClientCommunication, split by its `channel`). */
  source: string;
}

/**
 * All 15 timeline entry types named in the brief — single source of
 * truth for both the client-timeline aggregation service (which source
 * table/field each maps to) and the timeline UI (icons, filters,
 * labels). Three of the fifteen — call, message, meeting — are really
 * one source (`ClientCommunication`) split by its `channel` field, not
 * three separate tables; see docs/client-crm.md.
 */
export const TIMELINE_EVENT_TYPES: TimelineEventTypeDefinition[] = [
  { key: "enquiry", label: "Enquiry", source: "Lead" },
  { key: "call", label: "Call", source: "ClientCommunication (channel=call)" },
  { key: "message", label: "Message", source: "ClientCommunication (channel=whatsapp|sms|email)" },
  { key: "meeting", label: "Meeting", source: "ClientCommunication (channel=meeting)" },
  { key: "quotation", label: "Quotation", source: "Quotation" },
  { key: "booking", label: "Booking", source: "Event (status=confirmed)" },
  { key: "event", label: "Event", source: "Event" },
  { key: "contract", label: "Contract", source: "ClientContract" },
  { key: "invoice", label: "Invoice", source: "Invoice" },
  { key: "payment", label: "Payment", source: "ClientPayment" },
  { key: "gallery", label: "Gallery", source: "Gallery" },
  { key: "album_selection", label: "Album selection", source: "Album" },
  { key: "print_order", label: "Print order", source: "PrintOrder" },
  { key: "delivery", label: "Delivery", source: "Delivery" },
  { key: "feedback", label: "Feedback", source: "ClientFeedback" },
];

export const TIMELINE_EVENT_TYPE_KEYS: TimelineEventType[] = TIMELINE_EVENT_TYPES.map((t) => t.key);

export function getTimelineEventTypeLabel(key: TimelineEventType): string {
  return TIMELINE_EVENT_TYPES.find((t) => t.key === key)?.label ?? key;
}
