export const ALBUM_PRODUCTION_STAGES = [
  "photos_selected",
  "designer_assigned",
  "design_started",
  "proof_uploaded",
  "client_review",
  "revision_requested",
  "approved",
  "sent_to_print",
  "printed",
  "dispatched",
  "delivered",
] as const;

export type AlbumProductionStage = (typeof ALBUM_PRODUCTION_STAGES)[number];

/**
 * The pipeline isn't strictly linear — `revision_requested` can loop
 * back to `client_review` (after a new proof), and both feed back into
 * `approved` once satisfied. Modeled as an explicit adjacency map
 * rather than a simple "next index" function, since a few stages have
 * more than one legitimate next stage and a couple of transitions
 * (revision → client_review) go *backward* through the nominal order.
 */
const ALLOWED_TRANSITIONS: Record<AlbumProductionStage, AlbumProductionStage[]> = {
  photos_selected: ["designer_assigned"],
  designer_assigned: ["design_started"],
  design_started: ["proof_uploaded"],
  proof_uploaded: ["client_review"],
  client_review: ["revision_requested", "approved"],
  revision_requested: ["design_started", "client_review"], // design_started: a new proof round begins; client_review: a revised proof went straight back for review
  approved: ["sent_to_print"],
  sent_to_print: ["printed"],
  printed: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
};

export function canTransition(from: AlbumProductionStage, to: AlbumProductionStage): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedNextStages(from: AlbumProductionStage): AlbumProductionStage[] {
  return ALLOWED_TRANSITIONS[from];
}
