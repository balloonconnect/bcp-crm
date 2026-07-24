"use client";

import * as React from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { Button } from "@bcp/ui";
import { flushOfflineQueue } from "../../lib/sync-queue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Mounted once, globally — handles every PWA concern that isn't tied
 * to one specific page: registering the service worker, capturing
 * and surfacing the "Install prompt" (the browser's own
 * `beforeinstallprompt` event, never a custom imitation of it), the
 * "Update notification" (a new service worker sits WAITING until this
 * component tells it to activate, so an update never yanks the UI out
 * from under someone mid-task), and flushing the offline queue the
 * moment the browser reports connectivity restored.
 */
export function PwaProvider() {
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(false);
  const waitingWorkerRef = React.useRef<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        waitingWorkerRef.current = registration.waiting;
        setUpdateAvailable(true);
      }
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
          }
        });
      });
    }).catch(() => undefined); // registration failing (e.g. unsupported browser) degrades to a normal, non-installable web app — never a broken one

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FLUSH_OFFLINE_QUEUE") void flushOfflineQueue();
    });
  }, []);

  React.useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    function handleOnline() {
      setIsOffline(false);
      void flushOfflineQueue();
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function handleApplyUpdate() {
    waitingWorkerRef.current?.postMessage({ type: "SKIP_WAITING" });
    setUpdateAvailable(false);
  }

  return (
    <>
      {isOffline && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-1.5 bg-amber-500 py-1 text-xs font-medium text-white">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          You&apos;re offline — cached data is shown, and queued actions will sync once you&apos;re back online.
        </div>
      )}

      {updateAvailable && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">A new version is available.</span>
          <Button type="button" size="sm" onClick={handleApplyUpdate}>Update</Button>
        </div>
      )}

      {installPrompt && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">Install Studio Console for quicker, offline-ready access.</span>
          <Button type="button" size="sm" onClick={() => void handleInstall()}>Install</Button>
          <button type="button" onClick={() => setInstallPrompt(null)} aria-label="Dismiss" className="text-muted-foreground"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      )}
    </>
  );
}
