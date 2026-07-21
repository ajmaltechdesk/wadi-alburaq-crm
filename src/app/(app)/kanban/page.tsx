"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { fetchClients, updateClient, logAudit } from "@/lib/data";
import type { Client, ClientStatus } from "@/lib/types";
import { KANBAN_STATUSES } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { Skeleton } from "@/components/ui";
import { PriorityBadge } from "@/components/clients/StatusBadge";

export default function KanbanPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ClientStatus | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchClients(profile.role, profile.uid).then((c) => {
      setClients(c);
      setLoading(false);
    });
  }, [profile]);

  const columns = useMemo(
    () => KANBAN_STATUSES.map((status) => ({
      status,
      items: clients.filter((c) => c.status === status),
    })),
    [clients]
  );

  const moveTo = async (clientId: string, status: ClientStatus) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client || client.status === status || !profile) return;
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status } : c)));
    try {
      await updateClient(clientId, { status });
      await logAudit(profile, "update", "client", clientId, client.status, status);
      toast.success(`${client.name} moved to ${status}`);
    } catch {
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: client.status } : c)));
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Lead Board</h1>
        <p className="text-sm text-fg-muted">Drag cards between stages to update client status</p>
      </div>

      <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
        {columns.map((col) => (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.status); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              if (dragId) moveTo(dragId, col.status);
              setDragId(null);
            }}
            className={cn(
              "flex flex-col rounded-xl border border-border bg-surface-2/50 transition-colors",
              overCol === col.status && "border-primary bg-primary-soft/40"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-bold">{col.status}</h2>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-fg-muted">
                {col.items.length}
              </span>
            </div>
            <div className="flex min-h-40 flex-1 flex-col gap-2 px-3 pb-3">
              {col.items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "card cursor-grab p-3 transition-all active:cursor-grabbing",
                    dragId === c.id && "rotate-1 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/clients/${c.id}`} className="flex min-w-0 items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                        {initials(c.name)}
                      </span>
                      <span className="truncate text-sm font-semibold hover:text-primary">{c.name}</span>
                    </Link>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <p className="mt-1.5 text-xs text-fg-muted">{c.clientCode} · {c.leadSource}</p>
                  {c.assignedEmployeeName && profile?.role !== "employee" && (
                    <p className="mt-1 text-[11px] text-fg-faint">{c.assignedEmployeeName}</p>
                  )}
                </div>
              ))}
              {col.items.length === 0 && (
                <p className="py-6 text-center text-xs text-fg-faint">Drop clients here</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
