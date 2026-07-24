"use client";

/**
 * A small, dependency-free IndexedDB wrapper — no new package added
 * this late in the build, since everything here is a handful of
 * straightforward object-store operations. Two kinds of data live
 * here, deliberately kept in separate stores:
 *
 * 1. `cache` — read-only snapshots of server data, refreshed whenever
 *    the app successfully fetches them online, and read from when
 *    offline. "View cached events / client contacts / shot lists /
 *    equipment checklists" all read from here.
 * 2. `queue` — pending writes made while offline (a note, a completed
 *    checklist item, a lead draft), flushed to the server once
 *    connectivity returns. This is deliberately the *only* kind of
 *    write this module ever queues — see `OFFLINE_QUEUEABLE_ACTIONS`
 *    in `offline-actions.ts` for exactly which actions qualify, and
 *    why most don't.
 */

const DB_NAME = "studio-console-offline";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache", { keyPath: "key" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache", "readwrite");
    tx.objectStore("cache").put({ key, value, cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet<T>(key: string): Promise<{ value: T; cachedAt: number } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache", "readonly");
    const request = tx.objectStore("cache").get(key);
    request.onsuccess = () => resolve(request.result ? { value: request.result.value, cachedAt: request.result.cachedAt } : null);
    request.onerror = () => reject(request.error);
  });
}

export interface QueuedAction {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attemptCount: number;
  lastError?: string;
}

export async function queueAdd(action: Omit<QueuedAction, "id" | "createdAt" | "attemptCount">): Promise<QueuedAction> {
  const db = await openDb();
  const full: QueuedAction = { ...action, id: crypto.randomUUID(), createdAt: Date.now(), attemptCount: 0 };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put(full);
    tx.oncomplete = () => resolve(full);
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueList(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const request = tx.objectStore("queue").getAll();
    request.onsuccess = () => resolve(request.result as QueuedAction[]);
    request.onerror = () => reject(request.error);
  });
}

export async function queueRemove(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueUpdate(id: string, patch: Partial<QueuedAction>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      if (getRequest.result) store.put({ ...getRequest.result, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
