"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { fetchFollowUps, fetchTasks } from "@/lib/data";
import type { FollowUp, TaskItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Skeleton } from "@/components/ui";

export default function CalendarPage() {
  const { profile } = useAuth();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchFollowUps(profile.role, profile.uid),
      fetchTasks(profile.role, profile.uid),
    ]).then(([f, t]) => {
      setFollowups(f);
      setTasks(t);
      setLoading(false);
    });
  }, [profile]);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  }), [month]);

  const eventsOn = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      followups: followups.filter((f) => f.date === key),
      tasks: tasks.filter((t) => t.dueDate === key),
    };
  };

  const sel = eventsOn(selected);

  if (loading) return <Skeleton className="h-[32rem] w-full" />;

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Calendar</h1>
          <p className="text-sm text-fg-muted">Follow-ups and task deadlines at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-2" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-36 text-center font-bold">{format(month, "MMMM yyyy")}</span>
          <Button variant="secondary" className="h-9 px-2" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-border bg-surface-2/60 text-center text-xs font-bold uppercase tracking-wide text-fg-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const ev = eventsOn(d);
              const total = ev.followups.length + ev.tasks.length;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex min-h-20 cursor-pointer flex-col items-start border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-2",
                    !isSameMonth(d, month) && "bg-surface-2/40 text-fg-faint",
                    isSameDay(d, selected) && "bg-primary-soft"
                  )}
                >
                  <span className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday(d) && "bg-primary text-white dark:text-[#0b1421]"
                  )}>
                    {format(d, "d")}
                  </span>
                  {total > 0 && (
                    <span className="mt-auto flex flex-wrap gap-0.5">
                      {ev.followups.slice(0, 3).map((f) => (
                        <span key={f.id} className="size-1.5 rounded-full bg-accent" aria-hidden />
                      ))}
                      {ev.tasks.slice(0, 3).map((t) => (
                        <span key={t.id} className="size-1.5 rounded-full bg-warning" aria-hidden />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card h-fit p-4">
          <h2 className="mb-3 text-sm font-bold">{format(selected, "EEEE, dd MMMM")}</h2>
          {sel.followups.length === 0 && sel.tasks.length === 0 && (
            <p className="py-6 text-center text-sm text-fg-muted">Nothing scheduled</p>
          )}
          {sel.followups.map((f) => (
            <div key={f.id} className="mb-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Link href={`/clients/${f.clientId}`} className="text-sm font-semibold hover:text-primary">
                  {f.clientName ?? "Client"}
                </Link>
                <Badge tone="info">{f.mode}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">{f.time} · {f.status}</p>
            </div>
          ))}
          {sel.tasks.map((t) => (
            <div key={t.id} className="mb-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.name}</p>
                <Badge tone={t.priority === "High" ? "danger" : "warning"}>{t.priority}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">Task · {t.status}</p>
            </div>
          ))}
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> Follow-ups</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> Tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
