"use client";

import * as React from "react";
import { Calendar, Phone, MessageSquare, Users, FileText, CalendarCheck, PenLine, Receipt, Wallet, Image, BookImage, Printer, Truck, Star } from "lucide-react";
import { apiGet } from "../../../lib/api-client";

interface TimelineEntry {
  type: string;
  id: string;
  occurredAt: string;
  summary: string;
  detail?: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  enquiry: Calendar, call: Phone, message: MessageSquare, meeting: Users, quotation: FileText,
  booking: CalendarCheck, event: CalendarCheck, contract: PenLine, invoice: Receipt, payment: Wallet,
  gallery: Image, album_selection: BookImage, print_order: Printer, delivery: Truck, feedback: Star,
};

export function ClientTimelineTab({ clientId }: { clientId: string }) {
  const [entries, setEntries] = React.useState<TimelineEntry[]>([]);

  React.useEffect(() => {
    void apiGet<TimelineEntry[]>(`/clients/${clientId}/timeline`).then((res) => {
      if (res.ok && res.data) setEntries(res.data);
    });
  }, [clientId]);

  if (entries.length === 0) return <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => {
        const Icon = ICONS[entry.type] ?? Calendar;
        return (
          <li key={`${entry.type}-${entry.id}`} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm">{entry.summary}</p>
              {entry.detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.detail}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString("en-IN")}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
