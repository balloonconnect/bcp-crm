/**
 * The 14 message "functions" named in the brief — a registry of what
 * each one is for and whether it needs an approved template (Meta
 * requires a pre-approved template for any message sent outside a
 * customer-initiated 24-hour window, which most of these
 * business-initiated notifications are) or can go as free text/media
 * within that window. This is documentation the calling code in
 * `apps/api` is organized around, not enforced here — `@bcp/whatsapp`
 * has no way to know which window a given conversation is in.
 */
export const WHATSAPP_FUNCTIONS = [
  { key: "text_message", label: "Text message", needsTemplate: false },
  { key: "template_message", label: "Template message", needsTemplate: true },
  { key: "image", label: "Image", needsTemplate: false },
  { key: "pdf", label: "PDF", needsTemplate: false },
  { key: "quotation", label: "Quotation", needsTemplate: true },
  { key: "invoice", label: "Invoice", needsTemplate: true },
  { key: "receipt", label: "Receipt", needsTemplate: true },
  { key: "gallery", label: "Gallery", needsTemplate: true },
  { key: "payment_reminder", label: "Payment reminder", needsTemplate: true },
  { key: "booking_confirmation", label: "Booking confirmation", needsTemplate: true },
  { key: "event_reminder", label: "Event reminder", needsTemplate: true },
  { key: "selection_reminder", label: "Selection reminder", needsTemplate: true },
  { key: "delivery_notification", label: "Delivery notification", needsTemplate: true },
  { key: "review_request", label: "Review request", needsTemplate: true },
] as const;

export type WhatsAppFunctionKey = (typeof WHATSAPP_FUNCTIONS)[number]["key"];
