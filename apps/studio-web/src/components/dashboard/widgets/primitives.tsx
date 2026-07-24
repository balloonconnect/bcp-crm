"use client";

import { Badge } from "@bcp/ui";

export function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function StatDisplay({ value, label, tone = "default" }: { value: string; label: string; tone?: "default" | "positive" | "warning" | "danger" }) {
  const toneClass = { default: "text-foreground", positive: "text-success", warning: "text-warning", danger: "text-destructive" }[tone];
  return (
    <div>
      <p className={`font-display text-3xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyRow({ message }: { message: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{message}</p>;
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; variant?: "default" | "secondary" | "brand" | "success" | "warning" | "destructive" | "outline" };
}

export function ListRow({ title, subtitle, badge }: ListRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {badge && (
        <Badge variant={badge.variant ?? "outline"} className="shrink-0">
          {badge.label}
        </Badge>
      )}
    </li>
  );
}

export function ListDisplay({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col divide-y divide-border">{children}</ul>;
}
