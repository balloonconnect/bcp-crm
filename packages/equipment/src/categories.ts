/**
 * The 15 equipment categories named in the brief — picker suggestions,
 * not a database enum, same "seed-data, not a fixture" convention as
 * `Event.eventType`/`@bcp/catalog`'s `DEFAULT_SERVICES`.
 * `Equipment.category` stays free text so a studio can add its own.
 */
export const EQUIPMENT_CATEGORIES = [
  "Camera",
  "Lens",
  "Flash",
  "Continuous Light",
  "Trigger",
  "Drone",
  "Gimbal",
  "Microphone",
  "Tripod",
  "Battery",
  "Charger",
  "Memory Card",
  "Computer",
  "Hard Drive",
  "Accessory",
] as const;

export type StandardEquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
