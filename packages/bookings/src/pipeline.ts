export type BookingStatus =
  | "draft"
  | "awaiting_advance"
  | "confirmed"
  | "in_progress"
  | "editing"
  | "client_selection"
  | "album_design"
  | "printing"
  | "delivery"
  | "completed"
  | "cancelled";

export interface BookingStageDefinition {
  key: BookingStatus;
  label: string;
  order: number;
  kind: "open" | "closed";
}

/**
 * The 11-stage pipeline named in the brief — single source of truth for
 * both the studio-web workflow/timeline view and backend status
 * validation. Order roughly follows a real booking's life: money first
 * (draft → awaiting advance → confirmed), then the shoot itself
 * (in progress), then post-production (editing → client selection →
 * album design → printing → delivery), then done. `cancelled` can be
 * reached from anywhere open, so it's not slotted into the linear
 * sequence's order for transition purposes (see `canTransition`).
 */
export const BOOKING_STAGES: BookingStageDefinition[] = [
  { key: "draft", label: "Draft", order: 1, kind: "open" },
  { key: "awaiting_advance", label: "Awaiting advance", order: 2, kind: "open" },
  { key: "confirmed", label: "Confirmed", order: 3, kind: "open" },
  { key: "in_progress", label: "In progress", order: 4, kind: "open" },
  { key: "editing", label: "Editing", order: 5, kind: "open" },
  { key: "client_selection", label: "Client selection", order: 6, kind: "open" },
  { key: "album_design", label: "Album design", order: 7, kind: "open" },
  { key: "printing", label: "Printing", order: 8, kind: "open" },
  { key: "delivery", label: "Delivery", order: 9, kind: "open" },
  { key: "completed", label: "Completed", order: 10, kind: "closed" },
  { key: "cancelled", label: "Cancelled", order: 11, kind: "closed" },
];

export const BOOKING_STATUS_KEYS: BookingStatus[] = BOOKING_STAGES.map((s) => s.key);

export function getBookingStage(status: BookingStatus): BookingStageDefinition {
  const stage = BOOKING_STAGES.find((s) => s.key === status);
  if (!stage) throw new Error(`Unknown booking status: "${status}"`);
  return stage;
}

export function isClosedBookingStatus(status: BookingStatus): boolean {
  return getBookingStage(status).kind === "closed";
}

/** The production-pipeline stages proper — what a timeline/workflow view visualizes as steps, excluding "cancelled" (shown as a status badge instead of a step on the line, since a cancelled booking didn't progress through the remaining stages). */
export const WORKFLOW_STAGE_KEYS: BookingStatus[] = BOOKING_STAGES.filter((s) => s.key !== "cancelled").map((s) => s.key);

/**
 * A closed booking (`completed`/`cancelled`) is terminal — nothing
 * transitions out of it. From any open stage, a studio can move to any
 * other stage (forward to progress, backward to fix a mistake, or
 * straight to `cancelled`) — real bookings do fall through in ways that
 * don't fit a strict linear sequence (a client postpones indefinitely,
 * a studio corrects a stage set too early), and forcing every
 * intermediate stage first would just encourage working around
 * validation rather than using it. The UI presents the pipeline's
 * *next* stage as the default one-click action; this function only
 * blocks the one case that's never valid — moving out of a closed
 * booking.
 */
export function canTransition(from: BookingStatus): boolean {
  return !isClosedBookingStatus(from);
}

/** The pipeline's next step after `status` — what a workflow view offers as the default one-click "advance" action. `null` once a booking reaches `delivery` (the next manual step is marking it `completed`, a deliberate decision rather than an automatic one) or is already closed. */
export function getNextStage(status: BookingStatus): BookingStatus | null {
  if (isClosedBookingStatus(status)) return null;
  const current = getBookingStage(status);
  const next = BOOKING_STAGES.find((s) => s.order === current.order + 1 && s.kind === "open");
  return next?.key ?? null;
}
