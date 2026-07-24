"use client";

import * as React from "react";
import { portalApiFetch } from "../../lib/portal-api";
import { clearPortalSessionToken } from "../../lib/portal-session";

type Tab = "home" | "bookings" | "events" | "quotations" | "contracts" | "invoices" | "galleries" | "albums" | "support";

const TABS: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "bookings", label: "Bookings" },
  { key: "events", label: "Events" },
  { key: "quotations", label: "Quotations" },
  { key: "contracts", label: "Contracts" },
  { key: "invoices", label: "Invoices" },
  { key: "galleries", label: "Galleries" },
  { key: "albums", label: "Albums" },
  { key: "support", label: "Support" },
];

interface DashboardSummary {
  upcomingEvent: { id: string; eventType: string; scheduledAt: string } | null;
  pendingQuotations: number;
  outstandingInvoices: number;
  openSupportRequests: number;
}

const GALLERY_WEB = process.env.NEXT_PUBLIC_GALLERY_WEB_URL ?? "http://localhost:3004";

export function PortalDashboard({ studioSlug, studioName, sessionToken, onLogout }: { studioSlug: string; studioName: string; sessionToken: string; onLogout: () => void }) {
  const [tab, setTab] = React.useState<Tab>("home");
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);

  const load = React.useCallback(async () => {
    const res = await portalApiFetch<DashboardSummary>("/portal/dashboard", sessionToken);
    if (res.ok && res.data) setSummary(res.data);
  }, [sessionToken]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleLogout() {
    clearPortalSessionToken(studioSlug);
    onLogout();
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="flex items-center justify-between border-b border-border p-3">
        <span className="font-display text-lg">{studioName}</span>
        <button type="button" onClick={handleLogout} className="text-xs text-muted-foreground underline">Log out</button>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {tab === "home" && summary && (
          <div className="flex flex-col gap-3">
            <h1 className="mb-1 font-display text-xl">Welcome back</h1>
            {summary.upcomingEvent && (
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium capitalize">{summary.upcomingEvent.eventType}</p>
                <p className="text-muted-foreground">{new Date(summary.upcomingEvent.scheduledAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <SummaryCard label="Quotations to review" value={summary.pendingQuotations} onClick={() => setTab("quotations")} />
              <SummaryCard label="Invoices due" value={summary.outstandingInvoices} onClick={() => setTab("invoices")} />
              <SummaryCard label="Open requests" value={summary.openSupportRequests} onClick={() => setTab("support")} />
            </div>
          </div>
        )}

        {tab === "bookings" && <BookingsSection sessionToken={sessionToken} />}
        {tab === "events" && <EventsSection sessionToken={sessionToken} />}
        {tab === "quotations" && <QuotationsSection sessionToken={sessionToken} />}
        {tab === "contracts" && <ContractsSection sessionToken={sessionToken} />}
        {tab === "invoices" && <InvoicesSection sessionToken={sessionToken} />}
        {tab === "galleries" && <GalleriesSection sessionToken={sessionToken} />}
        {tab === "albums" && <AlbumsSection sessionToken={sessionToken} />}
        {tab === "support" && <SupportSection sessionToken={sessionToken} />}
      </main>

      {/* Simplified mobile dashboard nav — a sticky bottom bar of the most-used sections, not a dense sidebar that assumes a wide screen. */}
      <nav className="fixed inset-x-0 bottom-0 flex overflow-x-auto border-t border-border bg-background/95 backdrop-blur">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`flex-1 whitespace-nowrap px-3 py-2.5 text-xs ${tab === t.key ? "border-t-2 border-brand font-medium text-brand" : "text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SummaryCard({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center">
      <span className="font-display text-2xl">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function BookingsSection({ sessionToken }: { sessionToken: string }) {
  const [bookings, setBookings] = React.useState<{ id: string; status: string; eventType: string | null }[]>([]);
  React.useEffect(() => {
    void portalApiFetch<typeof bookings>("/portal/bookings", sessionToken).then((res) => res.ok && res.data && setBookings(res.data));
  }, [sessionToken]);
  return (
    <SectionList title="Bookings" items={bookings} empty="No bookings yet." render={(b) => <ListRow key={b.id} title={b.eventType ?? "Booking"} badge={b.status} />} />
  );
}

function EventsSection({ sessionToken }: { sessionToken: string }) {
  const [events, setEvents] = React.useState<{ id: string; eventType: string; scheduledAt: string; status: string }[]>([]);
  React.useEffect(() => {
    void portalApiFetch<typeof events>("/portal/events", sessionToken).then((res) => res.ok && res.data && setEvents(res.data));
  }, [sessionToken]);
  return (
    <SectionList title="Events" items={events} empty="No events yet." render={(e) => <ListRow key={e.id} title={e.eventType} subtitle={new Date(e.scheduledAt).toLocaleDateString("en-IN")} badge={e.status} />} />
  );
}

function QuotationsSection({ sessionToken }: { sessionToken: string }) {
  const [quotations, setQuotations] = React.useState<{ id: string; quotationNumber: string; status: string; totalAmount: number }[]>([]);
  const load = React.useCallback(async () => {
    const res = await portalApiFetch<typeof quotations>("/portal/quotations", sessionToken);
    if (res.ok && res.data) setQuotations(res.data);
  }, [sessionToken]);
  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAccept(id: string) {
    await portalApiFetch(`/portal/quotations/${id}/accept`, sessionToken, { method: "POST" });
    await load();
  }

  return (
    <SectionList
      title="Quotations"
      items={quotations}
      empty="No quotations yet."
      render={(q) => (
        <ListRow key={q.id} title={q.quotationNumber} subtitle={`₹${(q.totalAmount / 100).toLocaleString("en-IN")}`} badge={q.status}>
          {q.status === "sent" && <button type="button" onClick={() => void handleAccept(q.id)} className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">Accept</button>}
        </ListRow>
      )}
    />
  );
}

const CLIENT_PORTAL_ORIGIN = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? "";

function ContractsSection({ sessionToken }: { sessionToken: string }) {
  const [contracts, setContracts] = React.useState<{ id: string; title: string; status: string; publicToken: string }[]>([]);
  const load = React.useCallback(async () => {
    const res = await portalApiFetch<typeof contracts>("/portal/contracts", sessionToken);
    if (res.ok && res.data) setContracts(res.data);
  }, [sessionToken]);
  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <SectionList
      title="Contracts"
      items={contracts}
      empty="No contracts yet."
      render={(c) => (
        <ListRow key={c.id} title={c.title} badge={c.status}>
          {c.status === "sent" && (
            <a href={`${CLIENT_PORTAL_ORIGIN}/contracts/${c.publicToken}`} className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">Review &amp; sign</a>
          )}
          {c.status === "draft" && <span className="text-xs text-muted-foreground">Awaiting studio</span>}
        </ListRow>
      )}
    />
  );
}

function InvoicesSection({ sessionToken }: { sessionToken: string }) {
  const [invoices, setInvoices] = React.useState<{ id: string; invoiceNumber: string; status: string; totalAmount: number; amountPaid: number; payments: { receipt: { receiptNumber: string } | null }[] }[]>([]);
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const load = React.useCallback(async () => {
    const res = await portalApiFetch<typeof invoices>("/portal/invoices", sessionToken);
    if (res.ok && res.data) setInvoices(res.data);
  }, [sessionToken]);
  React.useEffect(() => {
    void load();
  }, [load]);

  async function handlePay(id: string) {
    const amountPaise = Math.round(Number(amount) * 100);
    if (!amountPaise) return;
    await portalApiFetch(`/portal/invoices/${id}/payment`, sessionToken, { method: "POST", body: JSON.stringify({ amount: amountPaise, method: "bank_transfer" }) });
    setPayingId(null); setAmount("");
    await load();
  }

  return (
    <SectionList
      title="Invoices"
      items={invoices}
      empty="No invoices yet."
      render={(inv) => (
        <ListRow key={inv.id} title={inv.invoiceNumber} subtitle={`Paid ₹${(inv.amountPaid / 100).toLocaleString("en-IN")} of ₹${(inv.totalAmount / 100).toLocaleString("en-IN")}`} badge={inv.status}>
          <div className="flex flex-col items-end gap-1">
            {inv.status !== "paid" && (
              payingId === inv.id ? (
                <div className="flex gap-1">
                  <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs" />
                  <button type="button" onClick={() => void handlePay(inv.id)} className="rounded-md bg-brand px-2 text-xs font-medium text-brand-foreground">Confirm</button>
                </div>
              ) : (
                <button type="button" onClick={() => setPayingId(inv.id)} className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">I&apos;ve paid</button>
              )
            )}
            {inv.payments.filter((p) => p.receipt).map((p, i) => (
              <span key={i} className="text-xs text-muted-foreground">Receipt {p.receipt!.receiptNumber}</span>
            ))}
          </div>
        </ListRow>
      )}
    />
  );
}

function GalleriesSection({ sessionToken }: { sessionToken: string }) {
  const [galleries, setGalleries] = React.useState<{ id: string; title: string | null; publicToken: string }[]>([]);
  React.useEffect(() => {
    void portalApiFetch<typeof galleries>("/portal/galleries", sessionToken).then((res) => res.ok && res.data && setGalleries(res.data));
  }, [sessionToken]);
  return (
    <SectionList
      title="Galleries"
      items={galleries}
      empty="No galleries yet."
      render={(g) => (
        <ListRow key={g.id} title={g.title ?? "Gallery"}>
          <a href={`${GALLERY_WEB.replace(/\/$/, "")}/g/${g.publicToken}`} target="_blank" rel="noreferrer" className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">View</a>
        </ListRow>
      )}
    />
  );
}

function AlbumsSection({ sessionToken }: { sessionToken: string }) {
  const [albums, setAlbums] = React.useState<{ id: string; selectionLink: string; eAlbumLink: string | null; status: string; productionStage: string; printOrder: { status: string; courierName: string | null; trackingNumber: string | null; deliveredAt: string | null } | null }[]>([]);
  React.useEffect(() => {
    void portalApiFetch<typeof albums>("/portal/albums", sessionToken).then((res) => res.ok && res.data && setAlbums(res.data));
  }, [sessionToken]);
  return (
    <SectionList
      title="Albums"
      items={albums}
      empty="No albums yet."
      render={(a) => (
        <div key={a.id} className="flex flex-col gap-2 border-b border-border py-3 text-sm last:border-0">
          <div className="flex items-center justify-between">
            <span className="font-medium capitalize">{a.productionStage.replace(/_/g, " ")}</span>
            <span className="text-xs text-muted-foreground capitalize">{a.status.replace(/_/g, " ")}</span>
          </div>
          {a.printOrder?.trackingNumber && <p className="text-xs text-muted-foreground">Tracking: {a.printOrder.courierName} {a.printOrder.trackingNumber}{a.printOrder.deliveredAt ? " — Delivered" : ""}</p>}
          <div className="flex gap-2">
            <a href={`${GALLERY_WEB.replace(/\/$/, "")}/select/${a.selectionLink}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1 text-xs">Select photos</a>
            {a.eAlbumLink && <a href={`${GALLERY_WEB.replace(/\/$/, "")}/ealbum/${a.eAlbumLink}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1 text-xs">Review album</a>}
          </div>
        </div>
      )}
    />
  );
}

function SupportSection({ sessionToken }: { sessionToken: string }) {
  const [requests, setRequests] = React.useState<{ id: string; subject: string; message: string; status: string; replies: { id: string; body: string; authorType: string }[] }[]>([]);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const load = React.useCallback(async () => {
    const res = await portalApiFetch<typeof requests>("/portal/support-requests", sessionToken);
    if (res.ok && res.data) setRequests(res.data);
  }, [sessionToken]);
  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!subject.trim() || !message.trim()) return;
    await portalApiFetch("/portal/support-requests", sessionToken, { method: "POST", body: JSON.stringify({ subject, message }) });
    setSubject(""); setMessage("");
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg">Support</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {requests.map((r) => (
          <li key={r.id} className="p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">{r.subject}</span>
              <span className="text-xs capitalize text-muted-foreground">{r.status.replace(/_/g, " ")}</span>
            </div>
            <p className="text-muted-foreground">{r.message}</p>
            {r.replies.map((reply) => (
              <p key={reply.id} className="mt-1 rounded-md bg-accent p-2 text-xs">{reply.authorType === "studio" ? "Studio: " : "You: "}{reply.body}</p>
            ))}
          </li>
        ))}
        {requests.length === 0 && <li className="p-3 text-sm text-muted-foreground">No requests yet.</li>}
      </ul>
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        <textarea placeholder="How can we help?" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button type="button" onClick={() => void handleCreate()} className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Send</button>
      </div>
    </div>
  );
}

function SectionList<T>({ title, items, empty, render }: { title: string; items: T[]; empty: string; render: (item: T) => React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg">{title}</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {items.map(render)}
        {items.length === 0 && <li className="p-3 text-sm text-muted-foreground">{empty}</li>}
      </ul>
    </div>
  );
}

function ListRow({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 p-3 text-sm">
      <div>
        <p className="font-medium">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{badge.replace(/_/g, " ")}</span>}
        {children}
      </div>
    </li>
  );
}
