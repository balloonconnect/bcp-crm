"use client";

import * as React from "react";
import { Calendar, User2, MessageSquare, Image as ImageIcon, BookImage, Printer, Truck, FileText as FileTextIcon, Award } from "lucide-react";
import { ResponsiveDialog, Badge, Button, FormField, Select, Input, Textarea } from "@bcp/ui";
import { apiGet, apiPatch, apiPost, apiFetch } from "../../lib/api-client";
import { WorkflowStepper } from "./workflow-stepper";

interface TeamAssignment { id: string; role: string | null; studioUser: { id: string; name: string } }
interface PaymentMilestone { id: string; label: string; percentage: number; amount: number; status: string; dueDate: string | null }
interface LineItem { id: string; name: string; quantity: number; unitPrice: number; internalPrice: number | null }
interface BookingEvent { id: string; title: string; status: string; scheduledAt: string }
interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  deliverables: string[];
  notes: string | null;
  internalCost: number;
  sellingPrice: number;
  estimatedProfit: number;
  client: { id: string; name: string };
  package: { id: string; name: string } | null;
  contract: { id: string; title: string; status: string } | null;
  lineItems: LineItem[];
  teamAssignments: TeamAssignment[];
  paymentSchedule: PaymentMilestone[];
  events: BookingEvent[];
}
interface TimelineEntry { type: string; id: string; occurredAt: string; summary: string; detail?: string }

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const TIMELINE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  booking_created: Award, status_change: Award, event: Calendar, gallery: ImageIcon, album: BookImage, print_order: Printer, delivery: Truck, contract: FileTextIcon,
};

export function BookingDetailDialog({ bookingId, open, onOpenChange, onChanged }: { bookingId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [booking, setBooking] = React.useState<BookingDetail | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [notes, setNotes] = React.useState("");
  const [deliverablesText, setDeliverablesText] = React.useState("");
  const [newAssigneeId, setNewAssigneeId] = React.useState("");
  const [newAssigneeRole, setNewAssigneeRole] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!bookingId) return;
    const [detailRes, timelineRes] = await Promise.all([
      apiGet<BookingDetail>(`/bookings/${bookingId}`),
      apiGet<TimelineEntry[]>(`/bookings/${bookingId}/timeline`),
    ]);
    if (detailRes.ok && detailRes.data) {
      setBooking(detailRes.data);
      setNotes(detailRes.data.notes ?? "");
      setDeliverablesText(detailRes.data.deliverables.join(", "));
    }
    if (timelineRes.ok && timelineRes.data) setTimeline(timelineRes.data);
  }, [bookingId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleAdvance(status: string) {
    if (!bookingId) return;
    setBusy(true);
    await apiPatch(`/bookings/${bookingId}/status`, { status });
    await load();
    onChanged();
    setBusy(false);
  }

  async function handleSaveNotes() {
    if (!bookingId) return;
    setBusy(true);
    await apiPatch(`/bookings/${bookingId}`, { notes, deliverables: deliverablesText.split(",").map((d) => d.trim()).filter(Boolean) });
    await load();
    setBusy(false);
  }

  async function handleAssignTeam() {
    if (!bookingId || !newAssigneeId) return;
    setBusy(true);
    await apiPost(`/bookings/${bookingId}/team`, { studioUserId: newAssigneeId, role: newAssigneeRole || undefined });
    setNewAssigneeId("");
    setNewAssigneeRole("");
    await load();
    setBusy(false);
  }

  async function handleRemoveTeam(assignmentId: string) {
    if (!bookingId) return;
    await apiFetch(`/bookings/${bookingId}/team/${assignmentId}`, { method: "DELETE" });
    await load();
  }

  async function handleMilestoneStatus(milestoneId: string, status: string) {
    if (!bookingId) return;
    await apiPatch(`/bookings/${bookingId}/payment-schedule/${milestoneId}`, { status });
    await load();
  }

  if (!booking) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={booking.bookingNumber} description={booking.client.name} className="sm:max-w-2xl">
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Workflow</h3>
          <WorkflowStepper currentStatus={booking.status} onAdvance={handleAdvance} disabled={busy} />
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-md border border-border p-3">
          <div><p className="text-xs text-muted-foreground">Internal cost</p><p className="text-sm font-medium">{formatRupees(booking.internalCost)}</p></div>
          <div><p className="text-xs text-muted-foreground">Selling price</p><p className="text-sm font-medium">{formatRupees(booking.sellingPrice)}</p></div>
          <div><p className="text-xs text-muted-foreground">Est. profit</p><p className="text-sm font-medium">{formatRupees(booking.estimatedProfit)}</p></div>
        </div>

        {booking.package && <p className="text-sm">Package: <span className="font-medium">{booking.package.name}</span></p>}
        {booking.contract && <p className="text-sm">Contract: <span className="font-medium">{booking.contract.title}</span> <Badge variant="outline" className="ml-1">{booking.contract.status}</Badge></p>}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Services</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {booking.lineItems.map((item) => (
              <li key={item.id} className="flex justify-between py-1.5">
                <span>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
                <span className="text-muted-foreground">{formatRupees(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Events</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {booking.events.map((event) => (
              <li key={event.id} className="flex justify-between py-1.5">
                <span>{event.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(event.scheduledAt).toLocaleDateString("en-IN")} · {event.status}</span>
              </li>
            ))}
            {booking.events.length === 0 && <p className="py-2 text-xs text-muted-foreground">No events linked yet.</p>}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><User2 className="h-4 w-4" aria-hidden="true" />Assigned team</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {booking.teamAssignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-1.5">
                <span>{a.studioUser.name}{a.role ? ` — ${a.role}` : ""}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemoveTeam(a.id)}>Remove</Button>
              </li>
            ))}
            {booking.teamAssignments.length === 0 && <p className="py-2 text-xs text-muted-foreground">No one assigned yet.</p>}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Studio user ID" value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)} />
            <Input placeholder="Role (optional)" value={newAssigneeRole} onChange={(e) => setNewAssigneeRole(e.target.value)} />
            <Button type="button" size="sm" disabled={busy || !newAssigneeId} onClick={() => void handleAssignTeam()}>Add</Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Payment schedule</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {booking.paymentSchedule.map((milestone) => (
              <li key={milestone.id} className="flex items-center justify-between py-1.5">
                <span>{milestone.label} ({milestone.percentage}%) — {formatRupees(milestone.amount)}</span>
                <Select
                  value={milestone.status}
                  onChange={(e) => void handleMilestoneStatus(milestone.id, e.target.value)}
                  options={[{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "overdue", label: "Overdue" }]}
                  className="w-auto"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <FormField label="Deliverables" htmlFor="bd-deliverables" hint="Comma-separated"><Input id="bd-deliverables" value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} /></FormField>
          <FormField label="Notes" htmlFor="bd-notes"><Textarea id="bd-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
          <Button type="button" size="sm" className="self-start" disabled={busy} onClick={() => void handleSaveNotes()}>Save</Button>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare className="h-4 w-4" aria-hidden="true" />Timeline</h3>
          <ol className="flex flex-col gap-3">
            {timeline.map((entry) => {
              const Icon = TIMELINE_ICONS[entry.type] ?? Calendar;
              return (
                <li key={`${entry.type}-${entry.id}`} className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm">{entry.summary}</p>
                    {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString("en-IN")}</p>
                  </div>
                </li>
              );
            })}
            {timeline.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          </ol>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
