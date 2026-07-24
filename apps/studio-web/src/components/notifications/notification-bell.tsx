"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button, Badge } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    const res = await apiGet<NotificationRecord[]>("/notifications");
    if (res.ok && res.data) setNotifications(res.data);
  }, []);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleOpen() {
    setOpen((prev) => !prev);
  }

  async function handleMarkRead(id: string) {
    await apiPost(`/notifications/${id}/read`);
    await load();
  }

  async function handleMarkAllRead() {
    await apiPost("/notifications/read-all");
    await load();
  }

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="outline" size="icon" className="relative h-9 w-9" onClick={() => void handleOpen()} aria-label="Notifications">
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && <Badge variant="destructive" className="absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">{unreadCount}</Badge>}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && <button type="button" onClick={() => void handleMarkAllRead()} className="text-xs text-brand hover:underline">Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => !n.readAt && void handleMarkRead(n.id)} className={`flex w-full flex-col gap-0.5 border-b border-border p-3 text-left last:border-0 hover:bg-accent ${!n.readAt ? "bg-accent/50" : ""}`}>
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("en-IN")}</span>
                </button>
              </li>
            ))}
            {notifications.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
