export type BookingTimelineEventType = "booking_created" | "status_change" | "event" | "payment" | "gallery" | "album" | "print_order" | "delivery" | "contract";

export interface BookingTimelineEventTypeDefinition {
  key: BookingTimelineEventType;
  label: string;
}

/** Timeline entry types for a booking's visual history — single source of truth for both the aggregation service (apps/api) and the timeline UI's icon/label lookup, same pattern as `@bcp/clients`' timeline registry. */
export const BOOKING_TIMELINE_EVENT_TYPES: BookingTimelineEventTypeDefinition[] = [
  { key: "booking_created", label: "Booking created" },
  { key: "status_change", label: "Status changed" },
  { key: "event", label: "Shoot" },
  { key: "payment", label: "Payment" },
  { key: "gallery", label: "Gallery" },
  { key: "album", label: "Album" },
  { key: "print_order", label: "Print order" },
  { key: "delivery", label: "Delivery" },
  { key: "contract", label: "Contract" },
];

export function getBookingTimelineEventLabel(key: BookingTimelineEventType): string {
  return BOOKING_TIMELINE_EVENT_TYPES.find((t) => t.key === key)?.label ?? key;
}
