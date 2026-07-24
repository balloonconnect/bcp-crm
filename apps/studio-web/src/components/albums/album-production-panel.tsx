"use client";

import * as React from "react";
import { Palette, Truck, Smartphone, Share2 } from "lucide-react";
import { Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";

const STAGES = ["photos_selected", "designer_assigned", "design_started", "proof_uploaded", "client_review", "revision_requested", "approved", "sent_to_print", "printed", "dispatched", "delivered"];

interface AlbumDetail { id: string; productionStage: string; designerId: string | null; eAlbumToken: string | null }
interface Spread { id: string; spreadNumber: number; versionNumber: number; isCurrent: boolean; status: string }
interface PrintOrder { id: string; status: string; courierName: string | null; trackingNumber: string | null; dispatchedAt: string | null; deliveredAt: string | null }

export function AlbumProductionPanel({ albumId }: { albumId: string }) {
  const [album, setAlbum] = React.useState<AlbumDetail | null>(null);
  const [spreads, setSpreads] = React.useState<Spread[]>([]);
  const [printOrders, setPrintOrders] = React.useState<PrintOrder[]>([]);
  const [designerId, setDesignerId] = React.useState("");
  const [spreadNumber, setSpreadNumber] = React.useState("1");
  const [fileKey, setFileKey] = React.useState("");
  const [labName, setLabName] = React.useState("");
  const [courierName, setCourierName] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [ealbumPassword, setEalbumPassword] = React.useState("");
  const [sharePhone, setSharePhone] = React.useState("");
  const clientPortalBase = process.env.NEXT_PUBLIC_GALLERY_WEB_URL ?? "http://localhost:3004";

  const load = React.useCallback(async () => {
    const [albumRes, spreadsRes, ordersRes] = await Promise.all([
      apiGet<AlbumDetail>(`/albums/${albumId}`),
      apiGet<Spread[]>(`/albums/${albumId}/spreads`),
      apiGet<PrintOrder[]>(`/albums/${albumId}/print-orders`),
    ]);
    if (albumRes.ok && albumRes.data) setAlbum(albumRes.data);
    if (spreadsRes.ok && spreadsRes.data) setSpreads(spreadsRes.data);
    if (ordersRes.ok && ordersRes.data) setPrintOrders(ordersRes.data);
  }, [albumId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAssignDesigner() {
    if (!designerId.trim()) return;
    await apiPost(`/albums/${albumId}/designer`, { designerId });
    await load();
  }

  async function handleStageChange(stage: string) {
    await apiPost(`/albums/${albumId}/stage`, { stage });
    await load();
  }

  async function handleUploadSpread() {
    if (!fileKey.trim()) return;
    await apiPost(`/albums/${albumId}/spreads`, { spreadNumber: Number(spreadNumber), fileKey });
    setFileKey("");
    await load();
  }

  async function handleApproveFull() {
    await apiPost(`/albums/${albumId}/approve-full`);
    await load();
  }

  async function handleCreatePrintOrder() {
    await apiPost(`/albums/${albumId}/print-orders`, { labName: labName || undefined });
    setLabName("");
    await load();
  }

  async function handleDispatch(printOrderId: string) {
    if (!courierName.trim() || !trackingNumber.trim()) return;
    await apiPost(`/print-orders/${printOrderId}/dispatch`, { courierName, trackingNumber });
    setCourierName(""); setTrackingNumber("");
    await load();
  }

  async function handleDelivered(printOrderId: string) {
    await apiPost(`/print-orders/${printOrderId}/delivered`);
    await load();
  }

  async function handleCreateEalbumLink() {
    await apiPost(`/albums/${albumId}/ealbum/link`);
    await load();
  }

  async function handleSaveEalbumSettings() {
    await apiPatch(`/albums/${albumId}/ealbum/settings`, { password: ealbumPassword || undefined });
    setEalbumPassword("");
  }

  async function handleShareWhatsApp() {
    if (!sharePhone.trim()) return;
    await apiPost(`/albums/${albumId}/ealbum/share/whatsapp`, { toPhone: sharePhone });
    setSharePhone("");
  }

  if (!album) return null;

  const eAlbumUrl = album.eAlbumToken ? `${clientPortalBase.replace(/\/$/, "")}/ealbum/${album.eAlbumToken}` : null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Palette className="h-4 w-4" aria-hidden="true" />Design & production</h3>

      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((s) => (
          <Badge key={s} variant={s === album.productionStage ? "success" : "outline"} className="cursor-pointer capitalize" onClick={() => void handleStageChange(s)}>
            {s.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input placeholder="Designer (StudioUser ID)" value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="w-60" />
        <Button type="button" size="sm" variant="outline" onClick={() => void handleAssignDesigner()}>Assign</Button>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Spreads</h4>
        <ul className="mb-2 flex flex-col divide-y divide-border rounded-md border border-border">
          {spreads.filter((s) => s.isCurrent).map((s) => (
            <li key={s.id} className="flex items-center justify-between p-2 text-sm">
              <span>Spread {s.spreadNumber} (v{s.versionNumber})</span>
              <Badge variant="outline" className="capitalize">{s.status.replace(/_/g, " ")}</Badge>
            </li>
          ))}
          {spreads.filter((s) => s.isCurrent).length === 0 && <li className="p-2 text-xs text-muted-foreground">No spreads uploaded yet.</li>}
        </ul>
        <div className="flex gap-2">
          <Input type="number" min={1} value={spreadNumber} onChange={(e) => setSpreadNumber(e.target.value)} className="w-20" />
          <Input placeholder="Storage file key" value={fileKey} onChange={(e) => setFileKey(e.target.value)} />
          <Button type="button" size="sm" variant="outline" onClick={() => void handleUploadSpread()}>Upload</Button>
        </div>
        <Button type="button" size="sm" className="mt-2" onClick={() => void handleApproveFull()}>Mark fully approved</Button>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Truck className="h-4 w-4" aria-hidden="true" />Print & courier</h4>
        <div className="mb-2 flex gap-2">
          <Input placeholder="Lab name" value={labName} onChange={(e) => setLabName(e.target.value)} />
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCreatePrintOrder()}>Create print order</Button>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {printOrders.map((o) => (
            <li key={o.id} className="flex flex-col gap-1 p-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">{o.status}</Badge>
                {o.trackingNumber && <span className="text-xs text-muted-foreground">{o.courierName}: {o.trackingNumber}</span>}
              </div>
              {!o.dispatchedAt && (
                <div className="flex gap-2">
                  <Input placeholder="Courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Tracking #" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="h-8 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleDispatch(o.id)}>Dispatch</Button>
                </div>
              )}
              {o.dispatchedAt && !o.deliveredAt && (
                <Button type="button" size="sm" variant="outline" onClick={() => void handleDelivered(o.id)}>Mark delivered</Button>
              )}
            </li>
          ))}
          {printOrders.length === 0 && <li className="p-2 text-xs text-muted-foreground">No print orders yet.</li>}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Smartphone className="h-4 w-4" aria-hidden="true" />3D e-album</h4>
        {!eAlbumUrl ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCreateEalbumLink()}>Create e-album link</Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input readOnly value={eAlbumUrl} className="text-xs" />
            <div className="flex gap-2">
              <Input type="password" placeholder="Set a password (optional)" value={ealbumPassword} onChange={(e) => setEalbumPassword(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveEalbumSettings()}>Save</Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Phone number" value={sharePhone} onChange={(e) => setSharePhone(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={() => void handleShareWhatsApp()}><Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Share via WhatsApp</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
