"use client";

import * as React from "react";
import { Copy, FileCheck2, Ban, Download } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Version { id: string; versionNumber: number; createdAt: string }
interface AuditEntry { id: string; action: string; actorType: string; createdAt: string }
interface ContractDetail {
  id: string;
  title: string;
  status: string;
  publicToken: string;
  witnessRequired: boolean;
  certificateFileKey: string | null;
  versions: Version[];
  auditLogEntries: AuditEntry[];
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { draft: "outline", sent: "warning", signed: "success", void: "destructive" };

export function ContractDetailDialog({ contractId, open, onOpenChange, onChanged }: { contractId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [contract, setContract] = React.useState<ContractDetail | null>(null);
  const [copied, setCopied] = React.useState(false);
  const clientPortalBase = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? "http://localhost:3003";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const load = React.useCallback(async () => {
    if (!contractId) return;
    const res = await apiGet<ContractDetail>(`/contracts/${contractId}`);
    if (res.ok && res.data) setContract(res.data);
  }, [contractId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const signingUrl = contract ? `${clientPortalBase.replace(/\/$/, "")}/contracts/${contract.publicToken}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!contractId) return;
    await apiPost(`/contracts/${contractId}/send`);
    await load();
    onChanged();
  }

  async function handleVoid() {
    if (!contractId) return;
    await apiPost(`/contracts/${contractId}/void`);
    await load();
    onChanged();
  }

  if (!contract) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={contract.title} className="sm:max-w-xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[contract.status] ?? "outline"} className="capitalize">{contract.status}</Badge>
          {contract.witnessRequired && <Badge variant="outline">Witness required</Badge>}
          {contract.status === "draft" && <Button type="button" size="sm" onClick={() => void handleSend()}><FileCheck2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Send for signature</Button>}
          {contract.status !== "void" && contract.status !== "signed" && <Button type="button" size="sm" variant="outline" onClick={() => void handleVoid()}><Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Void</Button>}
          {contract.certificateFileKey && (
            <Button asChild size="sm" variant="outline">
              <a href={`${apiBase}/contracts/${contract.id}/certificate`} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Certificate</a>
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Input readOnly value={signingUrl} className="text-xs" />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => void handleCopyLink()}><Copy className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        {copied && <span className="text-xs text-muted-foreground">Copied.</span>}

        <div>
          <h4 className="mb-2 text-sm font-semibold">Version history</h4>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
            {contract.versions.map((v) => (
              <li key={v.id} className="flex justify-between p-2"><span>Version {v.versionNumber}</span><span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString("en-IN")}</span></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Audit trail</h4>
          <ul className="max-h-48 overflow-y-auto rounded-md bg-muted p-2 text-xs">
            {contract.auditLogEntries.map((a) => (
              <li key={a.id} className="py-0.5">{new Date(a.createdAt).toLocaleString("en-IN")} — {a.actorType} {a.action.replace(/_/g, " ")}</li>
            ))}
            {contract.auditLogEntries.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
          </ul>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
