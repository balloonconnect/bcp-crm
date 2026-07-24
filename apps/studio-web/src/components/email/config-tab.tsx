"use client";

import * as React from "react";
import { FormField, Input, Select, Button } from "@bcp/ui";
import { EMAIL_PROVIDERS } from "@bcp/email/src/providers";
import { apiGet, apiPut } from "../../lib/api-client";

interface Config {
  provider: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  resendApiKey: string | null;
  fromAddress: string | null;
  fromName: string | null;
  isActive: boolean;
}

export function ConfigTab() {
  const [config, setConfig] = React.useState<Partial<Config>>({ provider: "platform_smtp" });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    void apiGet<Config>("/email/config").then((res) => res.ok && res.data && setConfig(res.data));
  }, []);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await apiPut("/email/config", config);
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  const provider = config.provider ?? "platform_smtp";

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Provider" htmlFor="email-provider">
        <Select id="email-provider" value={provider} onChange={(e) => update("provider", e.target.value)} options={EMAIL_PROVIDERS.map((p) => ({ value: p.key, label: p.label }))} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="From address" htmlFor="email-from"><Input id="email-from" type="email" value={config.fromAddress ?? ""} onChange={(e) => update("fromAddress", e.target.value)} /></FormField>
        <FormField label="From name" htmlFor="email-from-name"><Input id="email-from-name" value={config.fromName ?? ""} onChange={(e) => update("fromName", e.target.value)} /></FormField>
      </div>

      {provider === "studio_smtp" && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="SMTP host" htmlFor="smtp-host"><Input id="smtp-host" value={config.smtpHost ?? ""} onChange={(e) => update("smtpHost", e.target.value)} /></FormField>
          <FormField label="SMTP port" htmlFor="smtp-port"><Input id="smtp-port" type="number" value={config.smtpPort ?? ""} onChange={(e) => update("smtpPort", Number(e.target.value))} /></FormField>
          <FormField label="SMTP user" htmlFor="smtp-user"><Input id="smtp-user" value={config.smtpUser ?? ""} onChange={(e) => update("smtpUser", e.target.value)} /></FormField>
          <FormField label="SMTP password" htmlFor="smtp-password"><Input id="smtp-password" type="password" value={config.smtpPassword ?? ""} onChange={(e) => update("smtpPassword", e.target.value)} /></FormField>
        </div>
      )}

      {provider === "resend" && (
        <FormField label="Resend API key" htmlFor="resend-key"><Input id="resend-key" type="password" value={config.resendApiKey ?? ""} onChange={(e) => update("resendApiKey", e.target.value)} /></FormField>
      )}

      {provider === "ses" && <p className="text-sm text-muted-foreground">Amazon SES needs the AWS SDK configured server-side — not wired up with live credentials in this environment yet.</p>}

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
