/**
 * "Queue supported actions" — and, just as importantly, "do not claim
 * offline support for operations requiring server authorization." This
 * is the one list every offline write in the app is checked against;
 * an action not in this list is never queued, full stop — the UI for
 * anything else (creating a quotation, recording a payment, sending a
 * WhatsApp message, approving an album) simply disables itself while
 * offline rather than pretending to queue something it can't honestly
 * guarantee will succeed later. The distinction is deliberate: every
 * action here is either purely additive (a note, a lead draft) or
 * idempotent-safe to replay (checking off a checklist item twice has
 * no bad effect) — nothing here can fail a business rule that only the
 * server can evaluate (available inventory, payment authorization,
 * a workflow state transition).
 */
export const OFFLINE_QUEUEABLE_ACTIONS = [
  { type: "add_note", endpoint: "/notes", method: "POST", label: "Add note" },
  { type: "complete_checklist_item", endpoint: "/equipment-checkouts/:id/checkin", method: "POST", label: "Check in equipment" },
  { type: "save_lead_draft", endpoint: "/leads", method: "POST", label: "Save lead draft" },
] as const;

export type OfflineActionType = (typeof OFFLINE_QUEUEABLE_ACTIONS)[number]["type"];

export function isOfflineQueueable(actionType: string): boolean {
  return OFFLINE_QUEUEABLE_ACTIONS.some((a) => a.type === actionType);
}

export function getOfflineActionDefinition(actionType: string) {
  return OFFLINE_QUEUEABLE_ACTIONS.find((a) => a.type === actionType);
}

/** Read operations this app caches for offline viewing — the other half of the brief's list, entirely separate from the write queue above. These are cached automatically whenever the relevant page loads successfully online (see `offline-db.ts`'s `cacheSet`), then read from cache when a fetch fails. */
export const OFFLINE_VIEWABLE_DATA = ["cached_events", "client_contacts", "shot_lists", "equipment_checklists"] as const;
