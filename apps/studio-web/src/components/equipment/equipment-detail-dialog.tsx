"use client";

import * as React from "react";
import { QrCode, LogOut, LogIn, Wrench, AlertTriangle } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Checkout { id: string; checkedOutAt: string; checkedInAt: string | null; expectedReturnAt: string | null; checkedOutBy: { name: string } }
interface EquipmentDetail {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  serialNumber: string | null;
  condition: string;
  currentStatus: string;
  warrantyExpiresAt: string | null;
  insuranceExpiresAt: string | null;
  maintenanceRecords: { id: string; performedAt: string; description: string | null; maintenanceType: string }[];
  repairRecords: { id: string; reportedAt: string; issueDescription: string; status: string }[];
  rentalRecords: { id: string; direction: string; counterpartyName: string; startDate: string; endDate: string }[];
  damageReports: { id: string; reportedAt: string; description: string; severity: string; resolvedAt: string | null }[];
  checkoutRecords: Checkout[];
  teamAssignments: { studioUser: { name: string } }[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = { available: "success", checked_out: "warning", in_maintenance: "outline", in_repair: "destructive", retired: "outline" };

export function EquipmentDetailDialog({ equipmentId, open, onOpenChange, onChanged }: { equipmentId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [equipment, setEquipment] = React.useState<EquipmentDetail | null>(null);
  const [expectedReturnAt, setExpectedReturnAt] = React.useState("");
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [repairDescription, setRepairDescription] = React.useState("");
  const [damageDescription, setDamageDescription] = React.useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const load = React.useCallback(async () => {
    if (!equipmentId) return;
    const res = await apiGet<EquipmentDetail>(`/equipment/${equipmentId}`);
    if (res.ok && res.data) setEquipment(res.data);
  }, [equipmentId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleCheckout() {
    if (!equipmentId) return;
    setCheckoutError(null);
    const res = await apiPost(`/equipment/${equipmentId}/checkout`, { expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : undefined });
    if (!res.ok) {
      setCheckoutError(res.error?.message ?? "Could not check out this item");
      return;
    }
    setExpectedReturnAt("");
    await load();
    onChanged();
  }

  async function handleCheckin(checkoutId: string) {
    await apiPost(`/equipment-checkouts/${checkoutId}/checkin`);
    await load();
    onChanged();
  }

  async function handleReportRepair() {
    if (!equipmentId || !repairDescription.trim()) return;
    await apiPost(`/equipment/${equipmentId}/repairs`, { issueDescription: repairDescription });
    setRepairDescription("");
    await load();
    onChanged();
  }

  async function handleReportDamage() {
    if (!equipmentId || !damageDescription.trim()) return;
    await apiPost(`/equipment/${equipmentId}/damage-reports`, { description: damageDescription });
    setDamageDescription("");
    await load();
    onChanged();
  }

  if (!equipment) return null;

  const activeCheckout = equipment.checkoutRecords.find((c) => !c.checkedInAt);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={equipment.name} description={equipment.category ?? undefined} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[equipment.currentStatus] ?? "outline"} className="capitalize">{equipment.currentStatus.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="capitalize">{equipment.condition}</Badge>
          {equipment.serialNumber && <span className="text-xs text-muted-foreground">SN: {equipment.serialNumber}</span>}
        </div>

        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated QR PNG, not a remote asset needing optimization */}
          <img src={`${apiBase}/equipment/${equipment.id}/qr`} alt={`QR code for ${equipment.name}`} className="h-24 w-24 rounded-md border border-border" />
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium"><QrCode className="h-4 w-4" aria-hidden="true" />Scan to check in/out</p>
            <p className="text-xs text-muted-foreground">Print this label and attach it to the item.</p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Checkout</h3>
          {activeCheckout ? (
            <div className="flex items-center justify-between rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <span>Checked out by {activeCheckout.checkedOutBy.name} on {new Date(activeCheckout.checkedOutAt).toLocaleDateString("en-IN")}</span>
              <Button type="button" size="sm" onClick={() => void handleCheckin(activeCheckout.id)}><LogIn className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Check in</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input type="datetime-local" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} className="w-auto" />
              <Button type="button" size="sm" onClick={() => void handleCheckout()}><LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Check out</Button>
            </div>
          )}
          {checkoutError && <p role="alert" className="mt-2 text-sm text-destructive">{checkoutError}</p>}
        </div>

        {equipment.teamAssignments.length > 0 && (
          <p className="text-sm"><span className="text-muted-foreground">Long-term assignment:</span> {equipment.teamAssignments.map((a) => a.studioUser.name).join(", ")}</p>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Wrench className="h-4 w-4" aria-hidden="true" />Maintenance & repairs</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {equipment.maintenanceRecords.map((m) => (
              <li key={m.id} className="py-1.5">{new Date(m.performedAt).toLocaleDateString("en-IN")} — {m.maintenanceType} {m.description ? `(${m.description})` : ""}</li>
            ))}
            {equipment.repairRecords.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-1.5">
                <span>{new Date(r.reportedAt).toLocaleDateString("en-IN")} — {r.issueDescription}</span>
                <Badge variant="outline" className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
              </li>
            ))}
            {equipment.maintenanceRecords.length === 0 && equipment.repairRecords.length === 0 && <p className="py-2 text-xs text-muted-foreground">No maintenance or repair history.</p>}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Report a repair issue…" value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={() => void handleReportRepair()}>Report</Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Damage reports</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {equipment.damageReports.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-1.5">
                <span>{new Date(d.reportedAt).toLocaleDateString("en-IN")} — {d.description}</span>
                <Badge variant={d.resolvedAt ? "success" : "destructive"} className="capitalize">{d.resolvedAt ? "Resolved" : d.severity}</Badge>
              </li>
            ))}
            {equipment.damageReports.length === 0 && <p className="py-2 text-xs text-muted-foreground">No damage reported.</p>}
          </ul>
          <div className="flex gap-2">
            <Textarea placeholder="Describe the damage…" rows={2} value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={() => void handleReportDamage()}>Report</Button>
          </div>
        </div>

        {equipment.rentalRecords.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Rental history</h3>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {equipment.rentalRecords.map((r) => (
                <li key={r.id} className="py-1.5">{r.direction === "rented_out" ? "Rented to" : "Rented from"} {r.counterpartyName} · {new Date(r.startDate).toLocaleDateString("en-IN")}–{new Date(r.endDate).toLocaleDateString("en-IN")}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
