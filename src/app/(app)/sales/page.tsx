"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { fetchSales, fetchUsers } from "@/lib/data";
import { exportCSV } from "@/lib/export";
import type { Sale, UserProfile } from "@/lib/types";
import { AED } from "@/lib/constants";
import { fmtDate, monthKey } from "@/lib/utils";
import { Badge, Button, EmptyState, Select, StatCard, TableSkeleton } from "@/components/ui";
import { BarsChart, ChartCard } from "@/components/charts/Charts";
import { Banknote, TrendingUp, Wallet, PiggyBank } from "lucide-react";

export default function SalesPage() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState("");
  const [monthFilter, setMonthFilter] = useState(monthKey());

  const isManagerial = profile?.role === "admin" || profile?.role === "manager";

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchSales(profile.role, profile.uid),
      isManagerial ? fetchUsers() : Promise.resolve([]),
    ]).then(([s, u]) => {
      setSales(s);
      setTeam(u);
      setLoading(false);
    });
  }, [profile, isManagerial]);

  const monthOptions = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  }), []);

  const filtered = useMemo(() => sales.filter((s) => {
    if (monthFilter && !s.saleDate?.startsWith(monthFilter)) return false;
    if (employee && s.assignedEmployeeId !== employee) return false;
    return true;
  }), [sales, monthFilter, employee]);

  const totals = useMemo(() => ({
    revenue: filtered.reduce((t, s) => t + (s.revenue || s.invoiceAmount || 0), 0),
    received: filtered.reduce((t, s) => t + (s.advancePayment || 0), 0),
    balance: filtered.reduce((t, s) => t + (s.balance || 0), 0),
    count: filtered.length,
  }), [filtered]);

  const byEmployee = useMemo(() => {
    if (!isManagerial) return [];
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const name = s.employeeName || "Unknown";
      map.set(name, (map.get(name) ?? 0) + (s.revenue || s.invoiceAmount || 0));
    });
    return [...map.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, isManagerial]);

  const doExport = () => {
    exportCSV("sales-" + monthFilter,
      ["Date", "Client", "Employee", "Service", "Invoice", "Advance", "Balance", "Status", "Method", "Invoice #"],
      filtered.map((s) => [
        s.saleDate, s.clientName, s.employeeName, s.serviceType,
        s.invoiceAmount, s.advancePayment, s.balance, s.paymentStatus, s.paymentMethod, s.invoiceNumber,
      ]));
  };

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{isManagerial ? "Sales" : "My Sales"}</h1>
          <p className="text-sm text-fg-muted">Revenue, payments and outstanding balances</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-44" aria-label="Month">
            {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          {isManagerial && (
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)} className="w-44" aria-label="Employee">
              <option value="">All Employees</option>
              {team.filter((t) => t.role === "employee").map((t) => (
                <option key={t.uid} value={t.uid}>{t.name}</option>
              ))}
            </Select>
          )}
          {isManagerial && (
            <Button variant="secondary" onClick={doExport}><Download className="size-4" /> Export</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={AED.format(totals.revenue)} icon={<Banknote className="size-5" />} tone="primary" />
        <StatCard label="Received" value={AED.format(totals.received)} icon={<Wallet className="size-5" />} tone="success" />
        <StatCard label="Outstanding" value={AED.format(totals.balance)} icon={<PiggyBank className="size-5" />} tone="warning" />
        <StatCard label="Deals" value={totals.count} icon={<TrendingUp className="size-5" />} tone="accent" />
      </div>

      {isManagerial && byEmployee.length > 0 && (
        <ChartCard title="Revenue by Employee">
          <BarsChart data={byEmployee} xKey="name" horizontal bars={[{ key: "revenue", name: "Revenue (AED)" }]} />
        </ChartCard>
      )}

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="No sales this period" hint="Record sales from a client's Payments tab." /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                {isManagerial && <th className="px-4 py-3">Employee</th>}
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3 text-right">Invoice</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-surface-2/50">
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(s.saleDate)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${s.clientId}`} className="font-semibold hover:text-primary">
                      {s.clientName ?? "—"}
                    </Link>
                  </td>
                  {isManagerial && <td className="px-4 py-3 text-fg-muted">{s.employeeName ?? "—"}</td>}
                  <td className="px-4 py-3">{s.serviceType}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{AED.format(s.invoiceAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{AED.format(s.balance)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.paymentStatus === "Paid" ? "success" : s.paymentStatus === "Partial" ? "warning" : "danger"}>
                      {s.paymentStatus}
                    </Badge>
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
