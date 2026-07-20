"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchNotifications, markNotificationRead } from "@/lib/data";
import type { AppNotification } from "@/lib/types";
import { cn, fmtDateTime } from "@/lib/utils";
import { Button, EmptyState, TableSkeleton } from "@/components/ui";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications(profile.uid, 100).then((n) => {
      setItems(n);
      setLoading(false);
    });
  }, [profile]);

  const markAll = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-fg-muted">{items.filter((n) => !n.read).length} unread</p>
        </div>
        <Button variant="secondary" onClick={markAll}>
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState title="No notifications" hint="Assignments, reminders and alerts will show up here." /></div>
      ) : (
        <div className="card divide-y divide-border p-0">
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.link || "#"}
              onClick={() => !n.read && markNotificationRead(n.id)}
              className={cn(
                "flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2",
                !n.read && "bg-primary-soft/40"
              )}
            >
              <span className={cn("mt-0.5 rounded-lg p-2", n.read ? "bg-surface-2 text-fg-faint" : "bg-primary-soft text-primary")}>
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                {n.body && <p className="text-xs text-fg-muted">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-fg-faint">{fmtDateTime(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
