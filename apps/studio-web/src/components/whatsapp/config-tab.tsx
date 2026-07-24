"use client";

import * as React from "react";
import { FormField, Input, Button } from "@bcp/ui";
import { apiGet, apiPut } from "../../lib/api-client";

interface Config {
  metaBusinessId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  accessToken: string | null;
  webhookVerifyToken: string | null;
  defaultSenderLabel: string | null;
  isActive: boolean;
}

export function ConfigTab() {
  const [config, setConfig] = React.useState<Partial<Config>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    void apiGet<Config>("/whatsapp/config").then((res) => res.ok && res.data && setConfig(res.data));
  }, []);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await apiPut("/whatsapp/config", config);
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Meta Business ID" htmlFor="wa-business-id"><Input id="wa-business-id" value={config.metaBusinessId ?? ""} onChange={(e) => update("metaBusinessId", e.target.value)} /></FormField>
        <FormField label="WhatsApp Business Account ID" htmlFor="wa-waba-id"><Input id="wa-waba-id" value={config.wabaId ?? ""} onChange={(e) => update("wabaId", e.target.value)} /></FormField>
        <FormField label="Phone Number ID" htmlFor="wa-phone-id"><Input id="wa-phone-id" value={config.phoneNumberId ?? ""} onChange={(e) => update("phoneNumberId", e.target.value)} /></FormField>
        <FormField label="Default sender label" htmlFor="wa-sender"><Input id="wa-sender" value={config.defaultSenderLabel ?? ""} onChange={(e) => update("defaultSenderLabel", e.target.value)} /></FormField>
        <FormField label="Access token" htmlFor="wa-token" fullWidth><Input id="wa-token" type="password" value={config.accessToken ?? ""} onChange={(e) => update("accessToken", e.target.value)} /></FormField>
        <FormField label="Webhook verify token" htmlFor="wa-webhook-token" fullWidth><Input id="wa-webhook-token" value={config.webhookVerifyToken ?? ""} onChange={(e) => update("webhookVerifyToken", e.target.value)} /></FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={config.isActive ?? false} onChange={(e) => update("isActive", e.target.checked)} />
        Active
      </label>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>{saving ? "Saving…" : "Save configuration"}</Button>
        {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
      </div>
    </div>
  );
}
