"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

const LAYOUT_OPTIONS = [
  { value: "grid", label: "Grid" }, { value: "masonry", label: "Masonry" }, { value: "story", label: "Story" }, { value: "timeline", label: "Timeline" }, { value: "highlights", label: "Highlights" },
];

export function GalleryFormDialog({ eventId, open, onOpenChange, onSaved }: { eventId: string; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [layout, setLayout] = React.useState("grid");
  const [password, setPassword] = React.useState("");
  const [otpRequired, setOtpRequired] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [downloadLimitPerGuest, setDownloadLimitPerGuest] = React.useState("");
  const [watermarkEnabled, setWatermarkEnabled] = React.useState(false);
  const [watermarkText, setWatermarkText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setLayout("grid"); setPassword(""); setOtpRequired(false);
      setExpiresAt(""); setDownloadLimitPerGuest(""); setWatermarkEnabled(false); setWatermarkText(""); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await apiPost(`/events/${eventId}/galleries`, {
      title: title || undefined,
      description: description || undefined,
      layout,
      password: password || undefined,
      otpRequired,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      downloadLimitPerGuest: downloadLimitPerGuest ? Number(downloadLimitPerGuest) : undefined,
      watermarkEnabled,
      watermarkText: watermarkEnabled ? watermarkText || undefined : undefined,
    });
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this gallery");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New gallery">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "gallery",
              columns: 2,
              children: (
                <>
                  <FormField label="Title" htmlFor="g-title" fullWidth><Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
                  <FormField label="Layout" htmlFor="g-layout"><Select id="g-layout" value={layout} onChange={(e) => setLayout(e.target.value)} options={LAYOUT_OPTIONS} /></FormField>
                  <FormField label="Expires" htmlFor="g-expires"><Input id="g-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></FormField>
                  <FormField label="Password" htmlFor="g-password" hint="Leave blank for no password"><Input id="g-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
                  <FormField label="Download limit per guest" htmlFor="g-limit" hint="Leave blank for unlimited"><Input id="g-limit" type="number" min="1" value={downloadLimitPerGuest} onChange={(e) => setDownloadLimitPerGuest(e.target.value)} /></FormField>
                  <FormField label="Description" htmlFor="g-description" fullWidth><Textarea id="g-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "options",
              columns: 1,
              children: (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={otpRequired} onChange={(e) => setOtpRequired(e.target.checked)} />
                    Require OTP verification
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} />
                    Watermark photos
                  </label>
                  {watermarkEnabled && <Input placeholder="Watermark text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />}
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create gallery"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
