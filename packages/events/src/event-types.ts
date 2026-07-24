/**
 * The 13 standard event types named in the brief — offered as picker
 * suggestions, not a database-level enum: `Event.eventType` stays free
 * text for consistency with `Lead.eventType`/`Package.eventType`, which
 * were already free text before this phase. Same "seed data, not a
 * fixture" relationship `@bcp/catalog`'s `DEFAULT_SERVICES` has to the
 * `Service` table.
 */
export const EVENT_TYPES = [
  "Wedding",
  "Reception",
  "Engagement",
  "Maternity",
  "Baby Shower",
  "Baby Shoot",
  "Birthday",
  "Temple Event",
  "Corporate",
  "School",
  "Outdoor",
  "Model Shoot",
  "Custom",
] as const;

export type StandardEventType = (typeof EVENT_TYPES)[number];
