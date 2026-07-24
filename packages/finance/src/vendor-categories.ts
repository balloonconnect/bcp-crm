/**
 * The 11 vendor categories named in the brief — picker suggestions, not
 * a database enum, same "seed-data, not a fixture" convention as
 * `Equipment.category`/`Event.eventType`. `Vendor.category` stays free
 * text so a studio can add its own.
 */
export const VENDOR_CATEGORIES = [
  "Album Lab",
  "Printing Lab",
  "Frame Vendor",
  "Freelancer",
  "Rental Provider",
  "Courier",
  "Travel",
  "Accommodation",
  "Food",
  "Editing",
  "Marketing",
] as const;

export type StandardVendorCategory = (typeof VENDOR_CATEGORIES)[number];
