"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, Menu, Moon, Search, Sun, UserRound } from "lucide-react";
import { collection, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn, initials } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { markNotificationRead } from "@/lib/data";
import { fmtDateTime } from "@/lib/utils";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Live notifications
  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification));
    });
  }, [profile]);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Ctrl+K → global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/clients?focus=search");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="no-print sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-md">
      <button
        onClick={onMenuClick}
        className="cursor-pointer rounded-lg p-2 text-fg-muted hover:bg-surface-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <button
        onClick={() => router.push("/clients?focus=search")}
        className="hidden h-10 w-72 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-fg-faint transition-colors hover:border-primary/40 sm:flex"
        aria-label="Global search"
      >
        <Search className="size-4" />
        <span>Quick search…</span>
        <kbd className="ml-auto rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5" ref={wrapRef}>
        <button
          onClick={toggle}
          className="cursor-pointer rounded-lg p-2.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
            className="relative cursor-pointer rounded-lg p-2.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="card animate-fade-up absolute right-0 top-12 z-[60] w-80 overflow-hidden p-0 shadow-(--shadow-pop)">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="font-bold">Notifications</p>
                <Link href="/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-fg-muted">No notifications yet</p>
                )}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "block w-full cursor-pointer border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2",
                      !n.read && "bg-primary-soft/40"
                    )}
                    onClick={async () => {
                      await markNotificationRead(n.id);
                      setNotifOpen(false);
                      if (n.link) router.push(n.link);
                    }}
                  >
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-fg-faint">{fmtDateTime(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface-2"
            aria-label="Account menu"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-[#14477d] to-[#17847b] text-xs font-bold text-white">
              {initials(profile?.name)}
            </span>
            <span className="hidden text-left md:block">
              <span className="block max-w-32 truncate text-sm font-semibold leading-tight">{profile?.name}</span>
              <span className="block text-[11px] capitalize leading-tight text-fg-faint">{profile?.role}</span>
            </span>
          </button>
          {userOpen && (
            <div className="card animate-fade-up absolute right-0 top-12 z-[60] w-56 overflow-hidden p-0 shadow-(--shadow-pop)">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-bold">{profile?.name}</p>
                <p className="truncate text-xs text-fg-muted">{profile?.email}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <UserRound className="size-4" /> My Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-danger-soft"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
