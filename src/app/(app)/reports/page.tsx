"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { fetchClients, fetchFollowUps, fetchSales, fetchTasks, fetchUsers } from "@/lib/data";
import { exportCSV, printReport } from "@/lib/export";
import type { Client, FollowUp, Sale, TaskItem, UserProfile } from "@/lib/types";
import { AED } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import { Button, Select, Skeleton } from "@/components/ui";
import { BarsChart, ChartCard, DonutChart } from "@/components/charts/Charts";

type ReportKey = "clients" | "revenue" | "leadSource" | "nationality" | "pending" | "completed" | "employee";

export default function ReportsPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportKey>("clients");
  const [range, setRange] = useState("all");

  const isManagerial = profile?.role === "admin" || profile?.role === "manager";

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchClients(profile.role, profile.uid),
      fetchSales(profile.role, profile.uid),
      fetchFollowUps(profile.role, profile.uid),
      fetchTasks(profile.role, profile.uid),
      isManagerial ? fetchUsers() : Promise.resolve([]),
    ]).then(([c, s, f, t, u]) => {
      setClients(c); setSales(s); setFollowups(f); setTasks(t); setTeam(u);
      setLoading(false);
    });
  }, [profile, isManagerial]);

  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const months = Number(range);
    return format(subMonths(new Date(), months), "yyyy-MM-dd");
  }, [range]);

  const inRange = (dateStr?: string) => !cutoff || (dateStr ?? "") >= cutoff;

  const scopedClients = useMemo(
    () => clients.filter((c) => inRange(c.createdAt ? fmtDate(c.createdAt, "yyyy-MM-dd") : "")),
    [clients, cutoff] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const scopedSales = useMemo(() => sales.filter((s) => inRange(s.saleDate)), [sales, cutoff]); // eslint-disable-line react-hooks/exhaustive-deps

  const countBy = (items: (string | undefined)[]) => {
    const map = new Map<string, number>();
    items.forEach((k) => k && map.set(k, (map.get(k) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const reportData = useMemo(() => {
    switch (report) {
      case "leadSource": return countBy(scopedClients.map((c) => c.leadSource));
      case "nationality": return countBy(scopedClients.map((c) => c.nationality));
      case "pending": return countBy(scopedClients.filter((c) => !["Completed", "Closed", "Rejected"].includes(c.status)).map((c) => c.status));
      case "completed": return countBy(scopedClients.filter((c) => ["Completed", "Closed", "Rejected"].includes(c.status)).map((c) => c.status));
      case "revenue": {
        return Array.from({ length: 6 }).map((_, i) => {
          const d = subMonths(new Date(), 5 - i);
          const key = format(d, "yyyy-MM");
          return {
            name: format(d, "MMM yyyy"),
            value: sales.filter((s) => s.saleDate?.startsWith(key)).reduce((t, s) => t + (s.revenue || s.invoiceAmount || 0), 0),
          };
        });
      }
      case "employee": {
        return team.filter((u) => u.role === "employee").map((e) => {
          const myClients = clients.filter((c) => c.assignedEmployeeId === e.uid);
          const myRevenue = scopedSales.filter((s) => s.assignedEmployeeId === e.uid)
            .reduce((t, s) => t + (s.revenue || s.invoiceAmount || 0), 0);
          const completed = myClients.filter((c) => c.status === "Completed").length;
          return {
            name: e.name,
            clients: myClients.length,
            completed,
            pending: myClients.length - completed,
            revenue: myRevenue,
            conversion: myClients.length ? Math.round((completed / myClients.length) * 100) : 0,
            followups: followups.filter((f) => f.assignedEmployeeId === e.uid && f.status === "Done").length,
            tasks: tasks.filter((t) => t.assignedTo === e.uid && t.status === "Completed").length,
          };
        }).sort((a, b) => b.revenue - a.revenue);
      }
      default: return countBy(scopedClients.map((c) => c.status));
    }
  }, [report, scopedClients, scopedSales, sales, clients, team, followups, tasks]);

  const doExport = () => {
    if (report === "employee") {
      const rows = reportData as { name: string; clients: number; completed: number; pending: number; revenue: number; conversion: number; followups: number; tasks: number }[];
      exportCSV("employee-performance",
        ["Employee", "Clients", "Completed", "Pending", "Revenue (AED)", "Conversion %", "Follow-ups Done", "Tasks Completed"],
        rows.map((r) => [r.name, r.clients, r.completed, r.pending, r.revenue, r.conversion, r.followups, r.tasks]));
    } else {
      const rows = reportData as { name: string; value: number }[];
      exportCSV(`report-${report}`, ["Category", report === "revenue" ? "Revenue (AED)" : "Count"],
        rows.map((r) => [r.name, r.value]));
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const reports: { key: ReportKey; label: string }[] = [
    { key: "clients", label: "Client Status Report" },
    { key: "revenue", label: "Revenue Report" },
    { key: "leadSource", label: "Lead Source Report" },
    { key: "nationality", label: "Nationality Report" },
    { key: "pending", label: "Pending Cases" },
    { key: "completed", label: "Completed / Closed Cases" },
    ...(isManagerial ? [{ key: "employee" as ReportKey, label: "Employee Performance" }] : []),
  ];

  return (
    <div className="animate-fade-up space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-sm text-fg-muted">
            {isManagerial ? "Company-wide analytics and exports" : "Your personal performance reports"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={report} onChange={(e) => setReport(e.target.value as ReportKey)} className="w-56" aria-label="Report type">
            {reports.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-36" aria-label="Date range">
            <option value="all">All time</option>
            <option value="1">Last month</option>
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last year</option>
          </Select>
          <Button variant="secondary" onClick={doExport}><Download className="size-4" /> CSV / Excel</Button>
          <Button variant="secondary" onClick={printReport}><Printer className="size-4" /> Print / PDF</Button>
        </div>
      </div>

      {report === "employee" ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3 text-right">Clients</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Conversion</th>
                <th className="px-4 py-3 text-right">Follow-ups</th>
                <th className="px-4 py-3 text-right">Tasks Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(reportData as { name: string; clients: number; completed: number; pending: number; revenue: number; conversion: number; followups: number; tasks: number }[]).map((r, i) => (
                <tr key={r.name} className={i === 0 ? "bg-success-soft/40" : undefined}>
                  <td className="px-4 py-3 font-bold">{i + 1}{i === 0 && " 🏆"}</td>
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.clients}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.completed}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.pending}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{AED.format(r.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.conversion}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.followups}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={reports.find((r) => r.key === report)?.label ?? ""}>
            {(reportData as { name: string; value: number }[]).length ? (
              report === "revenue" ? (
                <BarsChart data={reportData as Record<string, unknown>[]} xKey="name" bars={[{ key: "value", name: "Revenue (AED)" }]} />
              ) : (
                <DonutChart data={reportData as { name: string; value: number }[]} />
              )
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-fg-muted">No data for this period</p>
            )}
          </ChartCard>
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold">Breakdown</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {(reportData as { name: string; value: number }[]).map((r) => (
                  <tr key={r.name}>
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {report === "revenue" ? AED.format(r.value) : r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
