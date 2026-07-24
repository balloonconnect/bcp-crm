export const AUTOMATION_TRIGGERS = [
  { key: "lead_created", label: "Lead created", entityType: "Lead" },
  { key: "lead_inactive", label: "Lead inactive", entityType: "Lead" },
  { key: "follow_up_due", label: "Follow-up due", entityType: "Lead" },
  { key: "quotation_sent", label: "Quotation sent", entityType: "Quotation" },
  { key: "quotation_viewed", label: "Quotation viewed", entityType: "Quotation" },
  { key: "quotation_accepted", label: "Quotation accepted", entityType: "Quotation" },
  { key: "booking_confirmed", label: "Booking confirmed", entityType: "Booking" },
  { key: "payment_due", label: "Payment due", entityType: "Invoice" },
  { key: "payment_overdue", label: "Payment overdue", entityType: "Invoice" },
  { key: "event_upcoming", label: "Event upcoming", entityType: "Event" },
  { key: "gallery_published", label: "Gallery published", entityType: "Gallery" },
  { key: "selection_pending", label: "Selection pending", entityType: "Album" },
  { key: "album_approved", label: "Album approved", entityType: "Album" },
  { key: "delivery_completed", label: "Delivery completed", entityType: "Delivery" },
  { key: "birthday", label: "Birthday", entityType: "Client" },
  { key: "anniversary", label: "Anniversary", entityType: "Client" },
] as const;

export type AutomationTriggerKey = (typeof AUTOMATION_TRIGGERS)[number]["key"];

export function getTriggerDefinition(key: string) {
  return AUTOMATION_TRIGGERS.find((t) => t.key === key);
}
