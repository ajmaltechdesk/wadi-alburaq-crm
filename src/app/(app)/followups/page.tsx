"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { fetchFollowUps, updateFollowUp, logAudit } from "@/lib/data";
import type { FollowUp } from "@/lib/types";
import { fmtDate, todayStr } from "@/lib/utils";
import { Badge, Button, EmptyState, Tabs, TableSkeleton } from "@/components/ui";

export default function FollowupsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");
  const today = todayStr();

  useEffect(() => {
    if (!profile) return;
    fetchFollowUps(profile.role, profile.uid).then((f) => {
      setItems(f);
      setLoading(false);
    });
  }, [profile]);

  const groups = useMemo(() => ({
    today: items.filter((f) => f.date === today && f.status === "Pending"),
    upcoming: items.filter((f) => f.date > today && f.status === "Pending"),
    overdue: items.filter((f) => f.date < today && f.status === "Pending"),
    done: items.filter((f) => f.status !== "Pending"),
  }), [items, today]);

  const shown = groups[tab as keyof typeof groups] ?? [];

  const complete = async (f: FollowUp) => {
    const outcome = prompt("Outcome of this follow-up?") ?? "";
    try {
      await updateFollowUp(f.id, { status: "Done", outcome });
      if (profile) await logAudit(profile, "update", "followup", f.clientId, "Pending", "Done");
      setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: "Done", outcome } : x)));
      toast.success("Follow-up completed");
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Follow-ups</h1>
        <p className="text-sm text-fg-muted">Stay on top of every client conversation</p>
      </div>

      <Tabs
        tabs={[
          { key: "today", label: "Today", count: groups.today.length },
          { key: "overdue", label: "Overdue", count: groups.overdue.length },
          { key: "upcoming", label: "Upcoming", count: groups.upcoming.length },
          { key: "done", label: "Completed", count: groups.done.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <TableSkeleton />
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={tab === "today" ? "No follow-ups today" : tab === "overdue" ? "No overdue follow-ups" : "Nothing here"}
            hint="Schedule follow-ups from any client profile."
          />
        </div>
      ) : (
        <div className="card divide-y divide-border p-0">
          {shown.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/clients/${f.clientId}`} className="text-sm font-semibold hover:text-primary">
                  {f.clientName ?? "Client"}
                </Link>
                <p className="text-xs text-fg-muted">
                  {f.mode} · {fmtDate(f.date)} at {f.time}
                  {f.notes && ` — ${f.notes}`}
                </p>
                {f.outcome && <p className="text-xs text-success">Outcome: {f.outcome}</p>}
              </div>
              <Badge tone={
                f.status === "Done" ? "success" :
                f.status === "Pending" && f.date < today ? "danger" :
                f.status === "Pending" && f.date === today ? "warning" : "info"
              }>
                {f.status === "Pending" && f.date < today ? "Overdue" : f.status}
              </Badge>
              {f.status === "Pending" && (
                <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => complete(f)}>
                  Mark Done
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
