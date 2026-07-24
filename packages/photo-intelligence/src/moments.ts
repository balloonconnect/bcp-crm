/**
 * Suggested "Event moment tagging" vocabulary — picker suggestions for
 * the AI prompt and the studio's own manual tagging UI, not a fixed
 * enum. `PhotoAnalysis.momentTags` stays a free-text array so a studio
 * covering event types outside this list (a corporate event has no
 * "ring exchange") isn't boxed in. Same "seed suggestions, not a
 * fixture" convention as `EVENT_TYPES`/`VENDOR_CATEGORIES` elsewhere.
 */
export const SUGGESTED_MOMENT_TAGS = [
  "getting_ready",
  "first_look",
  "ceremony_entrance",
  "vows",
  "ring_exchange",
  "first_kiss",
  "first_dance",
  "cake_cutting",
  "bouquet_toss",
  "speeches",
  "family_portraits",
  "candid_reaction",
  "venue_details",
] as const;
