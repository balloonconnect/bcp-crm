"use client";

import * as React from "react";
import { ScanFace, ShieldCheck } from "lucide-react";
import { Button, Input } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";

interface Usage { sessionCount: number; indexedFaceCount: number; consentCount: number }
interface ConsentLog { id: string; guestToken: string; consentedAt: string }

export function FaceSearchPanel({ galleryId, faceSearchEnabled, confidenceThreshold, retentionDays, onChanged }: {
  galleryId: string;
  faceSearchEnabled: boolean;
  confidenceThreshold: number;
  retentionDays: number;
  onChanged: () => void;
}) {
  const [threshold, setThreshold] = React.useState(confidenceThreshold);
  const [retention, setRetention] = React.useState(retentionDays);
  const [usage, setUsage] = React.useState<Usage | null>(null);
  const [consentLogs, setConsentLogs] = React.useState<ConsentLog[]>([]);
  const [showLogs, setShowLogs] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<Usage>(`/galleries/${galleryId}/face-search/usage`);
    if (res.ok && res.data) setUsage(res.data);
  }, [galleryId]);

  React.useEffect(() => {
    if (faceSearchEnabled) void load();
  }, [faceSearchEnabled, load]);

  async function handleEnable() {
    await apiPost(`/galleries/${galleryId}/face-search/enable`);
    onChanged();
  }

  async function handleSaveSettings() {
    await apiPatch(`/galleries/${galleryId}/face-search/settings`, { faceSearchConfidenceThreshold: threshold, faceSearchRetentionDays: retention });
    onChanged();
  }

  async function handleViewLogs() {
    const res = await apiGet<ConsentLog[]>(`/galleries/${galleryId}/face-search/consent-logs`);
    if (res.ok && res.data) setConsentLogs(res.data);
    setShowLogs(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><ScanFace className="h-4 w-4" aria-hidden="true" />Face search (&quot;find my photos&quot;)</h3>

      {!faceSearchEnabled ? (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="mb-2 text-muted-foreground">Let guests find themselves by scanning their face or uploading a selfie. Requires AWS Rekognition to be configured for this environment.</p>
          <Button type="button" size="sm" onClick={() => void handleEnable()}>Enable face search</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          {usage && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="font-display text-lg">{usage.indexedFaceCount}</p><p className="text-xs text-muted-foreground">Faces indexed</p></div>
              <div><p className="font-display text-lg">{usage.sessionCount}</p><p className="text-xs text-muted-foreground">Searches run</p></div>
              <div><p className="font-display text-lg">{usage.consentCount}</p><p className="text-xs text-muted-foreground">Consents recorded</p></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Confidence threshold (%)
              <Input type="number" min="0" max="100" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Retention (days)
              <Input type="number" min="1" value={retention} onChange={(e) => setRetention(Number(e.target.value))} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveSettings()}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void handleViewLogs()}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Privacy logs</Button>
          </div>
          {showLogs && (
            <ul className="max-h-40 overflow-y-auto rounded-md bg-muted p-2 text-xs">
              {consentLogs.map((log) => (
                <li key={log.id} className="py-0.5">{new Date(log.consentedAt).toLocaleString("en-IN")} — guest {log.guestToken.slice(0, 8)}…</li>
              ))}
              {consentLogs.length === 0 && <li className="text-muted-foreground">No consents recorded yet.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
