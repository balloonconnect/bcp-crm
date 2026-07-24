"use client";

import * as React from "react";
import { apiGet, apiPost, apiFetch } from "./api-client";
import { computeFileChecksum, isOnWifi } from "./upload-checksum";

export interface QueueItem {
  sessionId: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "uploading" | "paused" | "processing" | "completed" | "failed" | "needs_file";
  uploadedChunks: number;
  totalChunks: number;
  chunkSize: number;
  checksum: string;
  failureReason?: string;
}

interface ServerSession {
  id: string;
  fileName: string;
  fileSize: number;
  status: string;
  uploadedChunks: number;
  totalChunks: number;
  chunkSize: number;
  checksum: string;
  failureReason: string | null;
}

const pauseFlags = new Map<string, boolean>();
const fileCache = new Map<string, File>(); // sessionId -> the actual File, held only while the tab is open

function toQueueItem(s: ServerSession): QueueItem {
  const hasFile = fileCache.has(s.id);
  return {
    sessionId: s.id,
    fileName: s.fileName,
    fileSize: s.fileSize,
    status: !hasFile && (s.status === "uploading" || s.status === "paused") ? "needs_file" : (s.status as QueueItem["status"]),
    uploadedChunks: s.uploadedChunks,
    totalChunks: s.totalChunks,
    chunkSize: s.chunkSize,
    checksum: s.checksum,
    failureReason: s.failureReason ?? undefined,
  };
}

/**
 * Owns the upload queue for one gallery. "Persist queue across
 * reloads" is real here at the level browsers actually allow: the
 * server remembers every in-flight session and which chunks landed
 * (`GET /galleries/:id/upload-sessions` on mount rebuilds the visible
 * queue), but a reloaded page has lost the actual `File` object's
 * bytes — there's no browser API to persist those across a reload —
 * so a resumed session is shown as "needs file" until the same file is
 * reselected, verified by checksum, and only the chunks that never
 * landed are re-sent.
 */
export function useUploadQueue(galleryId: string) {
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [wifiOnly, setWifiOnly] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const res = await apiGet<ServerSession[]>(`/galleries/${galleryId}/upload-sessions`);
    if (res.ok && res.data) setItems(res.data.map(toQueueItem));
  }, [galleryId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateItem = React.useCallback((sessionId: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((item) => (item.sessionId === sessionId ? { ...item, ...patch } : item)));
  }, []);

  async function uploadChunks(sessionId: string, file: File, chunkSize: number, totalChunks: number, startFrom: number) {
    for (let i = startFrom; i < totalChunks; i++) {
      if (pauseFlags.get(sessionId)) {
        updateItem(sessionId, { status: "paused" });
        return;
      }
      if (wifiOnly && isOnWifi() === false) {
        updateItem(sessionId, { status: "paused", failureReason: "Waiting for Wi-Fi…" });
        return;
      }

      const start = i * chunkSize;
      const blob = file.slice(start, Math.min(start + chunkSize, file.size));

      try {
        const urlRes = await apiGet<{ url: string }>(`/upload-sessions/${sessionId}/chunks/${i}/url`);
        if (!urlRes.ok || !urlRes.data) throw new Error("Could not get an upload URL");

        const putRes = await fetch(urlRes.data.url, { method: "PUT", body: blob });
        if (!putRes.ok) throw new Error("Chunk upload failed");
        const etag = putRes.headers.get("ETag") ?? "";

        const completeRes = await apiPost<ServerSession>(`/upload-sessions/${sessionId}/chunks/complete`, { chunkIndex: i, etag });
        if (completeRes.ok && completeRes.data) updateItem(sessionId, toQueueItem(completeRes.data));
      } catch {
        // Network recovery — a transient failure (dropped Wi-Fi, a flaky mobile connection) pauses this file rather than failing the whole queue; the user (or an auto-retry) picks up again from this exact chunk, nothing already uploaded is redone.
        updateItem(sessionId, { status: "failed", failureReason: "Network error — tap retry to continue from where it stopped." });
        return;
      }
    }
    fileCache.delete(sessionId);
  }

  async function addFiles(files: File[]) {
    for (const file of files) {
      const checksum = await computeFileChecksum(file);
      const res = await apiPost<ServerSession>(`/galleries/${galleryId}/upload-sessions`, { fileName: file.name, fileSize: file.size, mimeType: file.type, checksum, preferWifi: wifiOnly });

      if (!res.ok || !res.data) {
        if (res.error?.code === "DUPLICATE_UPLOAD") {
          setItems((prev) => [...prev, { sessionId: `dup-${checksum}`, fileName: file.name, fileSize: file.size, status: "completed", uploadedChunks: 1, totalChunks: 1, chunkSize: file.size, checksum, failureReason: "Already in this gallery" }]);
        }
        continue;
      }

      const session = res.data;
      fileCache.set(session.id, file);
      setItems((prev) => [...prev, toQueueItem(session)]);
      void uploadChunks(session.id, file, session.chunkSize, session.totalChunks, session.uploadedChunks);
    }
  }

  function pause(sessionId: string) {
    pauseFlags.set(sessionId, true);
    void apiPost(`/upload-sessions/${sessionId}/pause`);
    updateItem(sessionId, { status: "paused" });
  }

  async function resume(sessionId: string) {
    pauseFlags.set(sessionId, false);
    const file = fileCache.get(sessionId);
    const item = items.find((i) => i.sessionId === sessionId);
    if (!file || !item) {
      updateItem(sessionId, { status: "needs_file" });
      return;
    }
    await apiPost(`/upload-sessions/${sessionId}/resume`);
    updateItem(sessionId, { status: "uploading" });
    void uploadChunks(sessionId, file, item.chunkSize, item.totalChunks, item.uploadedChunks);
  }

  async function retry(sessionId: string) {
    const file = fileCache.get(sessionId);
    const item = items.find((i) => i.sessionId === sessionId);
    if (!file || !item) {
      updateItem(sessionId, { status: "needs_file" });
      return;
    }
    pauseFlags.set(sessionId, false);
    const res = await apiPost<ServerSession>(`/upload-sessions/${sessionId}/retry`);
    if (res.ok && res.data) updateItem(sessionId, toQueueItem(res.data));
    void uploadChunks(sessionId, file, item.chunkSize, item.totalChunks, item.uploadedChunks);
  }

  /** Re-attaches a `File` to a session that survived a reload as metadata only — checksum-verified before any chunk resumes, so a resumed upload can never silently continue with the wrong file. */
  async function reattachFile(sessionId: string, file: File) {
    const item = items.find((i) => i.sessionId === sessionId);
    if (!item) return;
    const checksum = await computeFileChecksum(file);
    if (checksum !== item.checksum) {
      updateItem(sessionId, { failureReason: "That's not the same file — checksum doesn't match." });
      return;
    }
    fileCache.set(sessionId, file);
    updateItem(sessionId, { status: "uploading", failureReason: undefined });
    void uploadChunks(sessionId, file, item.chunkSize, item.totalChunks, item.uploadedChunks);
  }

  async function remove(sessionId: string) {
    pauseFlags.delete(sessionId);
    fileCache.delete(sessionId);
    if (!sessionId.startsWith("dup-")) await apiFetch(`/upload-sessions/${sessionId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.sessionId !== sessionId));
  }

  return { items, wifiOnly, setWifiOnly, addFiles, pause, resume, retry, remove, reattachFile, refresh };
}
