import { queueList, queueRemove, queueUpdate } from "./offline-db";
import { getOfflineActionDefinition } from "./offline-actions";
import { apiFetch } from "./api-client";

const MAX_ATTEMPTS = 5;

/**
 * Flushes every queued offline action to the server, one at a time —
 * in the order they were created, since a lead draft saved before a
 * note about it should still land in that order. A failing action is
 * left in the queue with its attempt count incremented (capped at 5)
 * rather than silently dropped, so a genuinely broken sync is visible
 * rather than a queue that quietly loses work.
 */
export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  const actions = await queueList();
  let flushed = 0;
  let failed = 0;

  for (const action of actions.sort((a, b) => a.createdAt - b.createdAt)) {
    const definition = getOfflineActionDefinition(action.actionType);
    if (!definition) {
      await queueRemove(action.id); // an action type that no longer exists (e.g. after an app update) is discarded rather than retried forever
      continue;
    }

    try {
      const endpoint = definition.endpoint.replace(/:(\w+)/g, (_, param) => String(action.payload[param] ?? ""));
      const res = await apiFetch(endpoint, { method: definition.method, body: JSON.stringify(action.payload) });
      if (res.ok) {
        await queueRemove(action.id);
        flushed += 1;
      } else {
        throw new Error(res.error?.message ?? "Sync failed");
      }
    } catch (error) {
      failed += 1;
      const attemptCount = action.attemptCount + 1;
      if (attemptCount >= MAX_ATTEMPTS) await queueRemove(action.id);
      else await queueUpdate(action.id, { attemptCount, lastError: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return { flushed, failed };
}
