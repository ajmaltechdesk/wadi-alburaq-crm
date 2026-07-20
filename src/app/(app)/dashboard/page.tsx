"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, PhoneCall, CheckSquare, Banknote, Target, TrendingUp,
  FileWarning, Trophy, UserPlus, Briefcase,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { fetchClients, fetchFollowUps, fetchSales, fetchTasks, fetchUsers } from "@/lib/data";
import type { Client, FollowUp, Sale, TaskItem, UserProfile } from "@/lib/types";
import { AED } from "@/lib/constants";
import { todayStr, monthKey, fmtDate } from "@/lib/utils";
import { Badge, CardsSkeleton, StatCard } from "@/components/ui";
import { BarsChart, ChartCard, DonutChart, TrendChart } from "@/components/charts/Charts";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const role = profile?.role ?? "employee";
  const isEmployee = role === "employee";

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      try {
        const [c, s, f, t, u] = await Promise.all([
          fetchClients(role, profile.uid),
          fetchSales(role, profile.uid),
          fetchFollowUps(role, profile.uid),
          fetchTasks(role, profile.uid),
          role === "employee" ? Promise.resolve([]) : fetchUsers(),
        ]);
        if (cancelled) return;
        setClients(c); setSales(s); setFollowups(f); setTasks(t); setTeam(u);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile, role]);

  const today = todayStr();
  const thisMonth = monthKey();

  const metrics = useMemo(() => {
    const monthSales = sales.filter((s) => s.saleDate?.startsWith(thisMonth));
    const monthlyRevenue = monthSales.reduce((sum, s) => sum + (s.revenue || s.invoiceAmount || 0), 0);
    const completed = clients.filter((c) => c.status === "Completed").length;
    const active = clients.filter((c) => !["Completed", "Closed", "Rejected"].includes(c.status)).length;
    const pending = clients.filter((c) => ["Processing", "Documents Pending", "Payment Pending", "Submitted"].includes(c.status)).length;
    const docsPending = clients.filter((c) => c.status === "Documents Pending").length;
    const followupsToday = followups.filter((f) => f.date === today && f.status === "Pending").length;
    const openTasks = tasks.filter((t) => t.status === "Pending" || t.status === "In Progress").length;
    const newToday = clients.filter((c) => c.createdAt && fmtDate(c.createdAt, "yyyy-MM-dd") === today).length;
    const won = clients.filter((c) => ["Completed", "Approved"].includes(c.status)).length;
    const conversion = clients.length ? Math.round((won / clients.length) * 100) : 0;

    // Last 6 months revenue trend
    const trend = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const key = format(d, "yyyy-MM");
      return {
        month: format(d, "MMM"),
        revenue: sales.filter((s) => s.saleDate?.startsWith(key)).reduce((sum, s) => sum + (s.revenue || s.invoiceAmount || 0), 0),
        deals: sales.filter((s) => s.saleDate?.startsWith(key)).length,
      };
    });

    const countBy = (items: string[]) => {
      const map = new Map<string, number>();
      items.forEach((k) => k && map.set(k, (map.get(k) ?? 0) + 1));
      return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    const serviceDist = countBy(sales.map((s) => s.serviceType)).slice(0, 6);
    const leadSources = countBy(clients.map((c) => c.leadSource)).slice(0, 7);
    const nationalityDist = countBy(clients.map((c) => c.nationality ?? "")).slice(0, 7);

    // Per-employee comparison (manager/admin)
    const employees = team.filter((u) => u.role === "employee");
    const comparison = employees.map((e) => ({
      name: e.name.split(" ")[0],
      revenue: sales.filter((s) => s.assignedEmployeeId === e.uid && s.saleDate?.startsWith(thisMonth))
        .reduce((sum, s) => sum + (s.revenue || s.invoiceAmount || 0), 0),
      clients: clients.filter((c) => c.assignedEmployeeId === e.uid).length,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      monthlyRevenue, completed, active, pending, docsPending, followupsToday,
      openTasks, newToday, conversion, trend, serviceDist, leadSources, nationalityDist, comparison,
    };
  }, [clients, sales, followups, tasks, team, today, thisMonth]);

  const upcomingFollowups = useMemo(
    () => followups.filter((f) => f.status === "Pending" && f.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6),
    [followups, today]
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate <= today && t.status !== "Completed" && t.status !== "Cancelled").slice(0, 6),
    [tasks, today]
  );

  if (!profile || loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-64" />
        <CardsSkeleton />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72" /><div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  const target = profile.monthlyTarget ?? 0;
  const targetPct = target ? Math.min(100, Math.round((metrics.monthlyRevenue / target) * 100)) : null;

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isEmployee ? `Welcome back, ${profile.name.split(" ")[0]}` :
            role === "manager" ? "Team Dashboard" : "Business Overview"}
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {format(new Date(), "EEEE, dd MMMM yyyy")}
          {isEmployee && " — here's your workload today"}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={isEmployee ? "My Clients" : "Total Clients"} value={clients.length}
          icon={<Users className="size-5" />} tone="primary" sub={`${metrics.newToday} new today`} />
        <StatCard label={isEmployee ? "My Monthly Revenue" : "Monthly Revenue"} value={AED.format(metrics.monthlyRevenue)}
          icon={<Banknote className="size-5" />} tone="accent"
          sub={targetPct !== null ? `${targetPct}% of ${AED.format(target)} target` : undefined} />
        <StatCard label="Follow-ups Today" value={metrics.followupsToday}
          icon={<PhoneCall className="size-5" />} tone="warning" />
        <StatCard label={isEmployee ? "My Open Tasks" : "Open Tasks"} value={metrics.openTasks}
          icon={<CheckSquare className="size-5" />} tone="info" />
        <StatCard label="Active Cases" value={metrics.active} icon={<Briefcase className="size-5" />} tone="primary" />
        <StatCard label="Pending Cases" value={metrics.pending} icon={<FileWarning className="size-5" />} tone="warning"
          sub={`${metrics.docsPending} awaiting documents`} />
        <StatCard label="Completed Cases" value={metrics.completed} icon={<Trophy className="size-5" />} tone="success" />
        <StatCard label="Conversion Rate" value={`${metrics.conversion}%`} icon={<TrendingUp className="size-5" />} tone="accent" />
        {!isEmployee && (
          <>
            <StatCard label="Employees" value={team.filter((u) => u.role === "employee").length}
              icon={<UserPlus className="size-5" />} tone="info" />
            {role === "admin" && (
              <StatCard label="Managers" value={team.filter((u) => u.role === "manager").length}
                icon={<Target className="size-5" />} tone="primary" />
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={isEmployee ? "My Monthly Sales (AED)" : "Monthly Revenue (AED)"}>
          <TrendChart data={metrics.trend} xKey="month" yKey="revenue" name="Revenue" />
        </ChartCard>
        <ChartCard title={isEmployee ? "My Service Distribution" : "Service Distribution"}>
          {metrics.serviceDist.length ? <DonutChart data={metrics.serviceDist} /> :
            <p className="flex h-full items-center justify-center text-sm text-fg-muted">No sales recorded yet</p>}
        </ChartCard>
        <ChartCard title={isEmployee ? "My Lead Sources" : "Lead Source Analysis"}>
          {metrics.leadSources.length ? <DonutChart data={metrics.leadSources} /> :
            <p className="flex h-full items-center justify-center text-sm text-fg-muted">No clients yet</p>}
        </ChartCard>
        {isEmployee ? (
          <ChartCard title="My Deals per Month">
            <BarsChart data={metrics.trend} xKey="month" bars={[{ key: "deals", name: "Deals" }]} />
          </ChartCard>
        ) : (
          <ChartCard title="Employee Comparison — Revenue This Month">
            {metrics.comparison.length ? (
              <BarsChart data={metrics.comparison} xKey="name" horizontal
                bars={[{ key: "revenue", name: "Revenue (AED)" }]} />
            ) : <p className="flex h-full items-center justify-center text-sm text-fg-muted">No employees yet</p>}
          </ChartCard>
        )}
        {!isEmployee && (
          <ChartCard title="Nationality Distribution" className="lg:col-span-2">
            {metrics.nationalityDist.length ? (
              <BarsChart data={metrics.nationalityDist.map((n) => ({ name: n.name, count: n.value }))} xKey="name"
                bars={[{ key: "count", name: "Clients" }]} />
            ) : <p className="flex h-full items-center justify-center text-sm text-fg-muted">No data yet</p>}
          </ChartCard>
        )}
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Upcoming Follow-ups</h3>
            <Link href="/followups" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {upcomingFollowups.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">Nothing scheduled</p>}
          <ul className="divide-y divide-border">
            {upcomingFollowups.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/clients/${f.clientId}`} className="truncate text-sm font-semibold hover:text-primary">
                    {f.clientName ?? "Client"}
                  </Link>
                  <p className="text-xs text-fg-muted">{fmtDate(f.date)} at {f.time} · {f.mode}</p>
                </div>
                <Badge tone={f.date === today ? "warning" : "info"}>{f.date === today ? "Today" : "Upcoming"}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Today&apos;s Tasks</h3>
            <Link href="/tasks" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {todayTasks.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">All caught up 🎉</p>}
          <ul className="divide-y divide-border">
            {todayTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-fg-muted">Due {fmtDate(t.dueDate)}</p>
                </div>
                <Badge tone={t.priority === "High" ? "danger" : t.priority === "Medium" ? "warning" : "muted"}>
                  {t.priority}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
