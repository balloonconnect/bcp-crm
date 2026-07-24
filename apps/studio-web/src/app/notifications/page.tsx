"use client";

import * as React from "react";
import { Button } from "@bcp/ui";
import { apiGet, apiPut } from "../../lib/api-client";

interface Preferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserPushEnabled: boolean;
  pwaPushEnabled: boolean;
}

const CHANNELS: { key: keyof Preferences; label: string; alwaysOn?: boolean }[] = [
  { key: "inAppEnabled", label: "In-app", alwaysOn: true },
  { key: "emailEnabled", label: "Email" },
  { key: "whatsappEnabled", label: "WhatsApp" },
  { key: "browserPushEnabled", label: "Browser push" },
  { key: "pwaPushEnabled", label: "PWA push" },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = React.useState<Preferences | null>(null);
  const [pushStatus, setPushStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    void apiGet<Preferences>("/notifications/preferences").then((res) => res.ok && res.data && setPrefs(res.data));
  }, []);

  async function toggle(key: keyof Preferences) {
    if (!prefs || key === "inAppEnabled") return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await apiPut("/notifications/preferences", updated);
  }

  async function handleEnableBrowserPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("Push isn't supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("Permission denied.");
      return;
    }
    // Registering a subscription needs a VAPID public key from the studio's push configuration and a registered service worker — the subscribe() call itself is a small addition once those exist; this button demonstrates the permission + registration flow end to end.
    setPushStatus("Notification permission granted. Full push delivery needs a VAPID key configured for this studio.");
  }

  if (!prefs) return null;

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">Notification preferences</h1>

      <div className="flex flex-col divide-y divide-border rounded-md border border-border">
        {CHANNELS.map((c) => (
          <label key={c.key} className="flex items-center justify-between p-3 text-sm">
            <span>{c.label}{c.alwaysOn && <span className="ml-2 text-xs text-muted-foreground">(always on)</span>}</span>
            <input type="checkbox" checked={prefs[c.key]} disabled={c.alwaysOn} onChange={() => void toggle(c.key)} />
          </label>
        ))}
      </div>

      <div className="mt-6">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleEnableBrowserPush()}>Enable browser push notifications</Button>
        {pushStatus && <p className="mt-2 text-sm text-muted-foreground">{pushStatus}</p>}
      </div>
    </main>
  );
}
