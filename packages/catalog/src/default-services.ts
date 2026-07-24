export type ServiceCategory =
  | "photography"
  | "videography"
  | "aerial_and_specialty"
  | "streaming_and_display"
  | "print_and_album"
  | "post_production"
  | "logistics"
  | "styling";

export const SERVICE_CATEGORIES: { key: ServiceCategory; label: string }[] = [
  { key: "photography", label: "Photography" },
  { key: "videography", label: "Videography" },
  { key: "aerial_and_specialty", label: "Aerial & specialty capture" },
  { key: "streaming_and_display", label: "Streaming & display" },
  { key: "print_and_album", label: "Print & album" },
  { key: "post_production", label: "Post-production" },
  { key: "logistics", label: "Logistics" },
  { key: "styling", label: "Styling" },
];

export interface DefaultServiceDefinition {
  name: string;
  category: ServiceCategory;
  unit: "per_event" | "per_hour" | "per_day" | "per_item";
}

/**
 * The 16 services named in the brief — offered as one-click seed data
 * (`apps/api`'s `seedDefaultServices`) for a new studio, not a fixed
 * list; every one of them is just a normal `Service` row a studio can
 * rename, reprice, or delete like anything else it creates itself.
 */
export const DEFAULT_SERVICES: DefaultServiceDefinition[] = [
  { name: "Traditional Photography", category: "photography", unit: "per_event" },
  { name: "Candid Photography", category: "photography", unit: "per_event" },
  { name: "Traditional Videography", category: "videography", unit: "per_event" },
  { name: "Cinematic Videography", category: "videography", unit: "per_event" },
  { name: "Drone", category: "aerial_and_specialty", unit: "per_event" },
  { name: "Live Streaming", category: "streaming_and_display", unit: "per_event" },
  { name: "LED Wall", category: "streaming_and_display", unit: "per_day" },
  { name: "Insta360", category: "aerial_and_specialty", unit: "per_event" },
  { name: "Outdoor Shoot", category: "photography", unit: "per_day" },
  { name: "Album", category: "print_and_album", unit: "per_item" },
  { name: "Frame", category: "print_and_album", unit: "per_item" },
  { name: "Calendar", category: "print_and_album", unit: "per_item" },
  { name: "Editing", category: "post_production", unit: "per_event" },
  { name: "Travel", category: "logistics", unit: "per_day" },
  { name: "Accommodation", category: "logistics", unit: "per_day" },
  { name: "Makeup Shoot", category: "styling", unit: "per_event" },
];
