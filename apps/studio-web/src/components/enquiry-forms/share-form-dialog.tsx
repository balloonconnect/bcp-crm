"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { ResponsiveDialog, Button } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";

interface ShareAssets {
  publicUrl: string;
  embedCode: string;
  qrCodeDataUrl: string;
}

function CopyableBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => void handleCopy()}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">{value}</pre>
    </div>
  );
}

export function ShareFormDialog({ formId, open, onOpenChange }: { formId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [assets, setAssets] = React.useState<ShareAssets | null>(null);

  React.useEffect(() => {
    if (!open || !formId) {
      setAssets(null);
      return;
    }
    void apiGet<ShareAssets>(`/enquiry-forms/${formId}/share`).then((res) => {
      if (res.ok && res.data) setAssets(res.data);
    });
  }, [open, formId]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Share this form" className="sm:max-w-lg">
      {!assets ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <CopyableBlock label="Public link" value={assets.publicUrl} />
          <CopyableBlock label="Embed code" value={assets.embedCode} />
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">QR code</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- a server-generated data URI, not a remote asset */}
            <img src={assets.qrCodeDataUrl} alt="QR code linking to this enquiry form" className="h-40 w-40 rounded-md border border-border" />
            <a href={assets.qrCodeDataUrl} download="enquiry-form-qr.png" className="mt-2 inline-block text-sm text-brand underline">
              Download QR code
            </a>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
