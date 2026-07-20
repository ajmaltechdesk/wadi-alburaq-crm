"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchAuditLogs } from "@/lib/data";
import type { AuditLog } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { Badge, EmptyState, SearchBox, TableSkeleton } from "@/components/ui";

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const isManagerial = profile?.role === "admin" || profile?.role === "manager";

  useEffect(() => {
    if (!profile) return;
    fetchAuditLogs(profile.role, profile.uid, 300).then((l) => {
      setLogs(l);
      setLoading(false);
    });
  }, [profile]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((l) =>
      l.userName.toLowerCase().includes(needle) ||
      l.action.toLowerCase().includes(needle) ||
      l.entity.toLowerCase().includes(needle) ||
      l.updatedValue?.toLowerCase().includes(needle)
    );
  }, [logs, q]);

  const actionTone = (a: string) =>
    a === "create" || a === "upload" ? "success" : a === "delete" ? "danger" : "info";

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-fg-muted">
          {isManagerial ? "Complete activity trail across the organization" : "Your activity history"}
        </p>
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search by user, action, entity…" className="max-w-md" />

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="No activity recorded" hint="Actions across the system are logged here automatically." /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="hidden px-4 py-3 lg:table-cell">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-surface-2/50">
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold">{l.userName}</td>
                  <td className="px-4 py-3 capitalize text-fg-muted">{l.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={actionTone(l.action)}><span className="capitalize">{l.action}</span></Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{l.entity}</td>
                  <td className="hidden max-w-72 truncate px-4 py-3 text-fg-muted lg:table-cell">
                    {l.previousValue && l.updatedValue
                      ? `${l.previousValue} → ${l.updatedValue}`
                      : l.updatedValue || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
