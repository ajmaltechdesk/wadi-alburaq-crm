"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchClients, fetchUsers } from "@/lib/data";
import { exportCSV } from "@/lib/export";
import type { Client, UserProfile } from "@/lib/types";
import { CLIENT_STATUSES, LEAD_SOURCES, NATIONALITIES, PRIORITIES } from "@/lib/constants";
import { fmtDate, initials } from "@/lib/utils";
import { Button, EmptyState, Pagination, SearchBox, Select, TableSkeleton } from "@/components/ui";
import { PriorityBadge, StatusBadge } from "@/components/clients/StatusBadge";

const PAGE_SIZE = 15;

function ClientsPageInner() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const searchRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [nationality, setNationality] = useState("");
  const [employee, setEmployee] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const isManagerial = profile?.role === "admin" || profile?.role === "manager";

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const [c, u] = await Promise.all([
        fetchClients(profile.role, profile.uid),
        isManagerial ? fetchUsers() : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setClients(c);
      setTeam(u);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile, isManagerial]);

  useEffect(() => {
    if (params.get("focus") === "search") {
      searchRef.current?.querySelector("input")?.focus();
    }
  }, [params]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (needle &&
        !(c.name.toLowerCase().includes(needle) ||
          c.clientCode?.toLowerCase().includes(needle) ||
          c.mobile?.includes(needle) ||
          c.whatsapp?.includes(needle) ||
          c.email?.toLowerCase().includes(needle) ||
          c.passportNumber?.toLowerCase().includes(needle))) return false;
      if (status && c.status !== status) return false;
      if (priority && c.priority !== priority) return false;
      if (source && c.leadSource !== source) return false;
      if (nationality && c.nationality !== nationality) return false;
      if (employee && c.assignedEmployeeId !== employee) return false;
      return true;
    });
  }, [clients, q, status, priority, source, nationality, employee]);

  useEffect(() => setPage(1), [q, status, priority, source, nationality, employee]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const doExport = () => {
    exportCSV(
      "clients",
      ["Code", "Name", "Mobile", "Email", "Nationality", "Passport", "Status", "Priority", "Lead Source", "Assigned To", "Created"],
      filtered.map((c) => [
        c.clientCode, c.name, c.mobile, c.email, c.nationality, c.passportNumber,
        c.status, c.priority, c.leadSource, c.assignedEmployeeName, fmtDate(c.createdAt),
      ])
    );
  };

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isManagerial ? "All Clients" : "My Clients"}
          </h1>
          <p className="text-sm text-fg-muted">{filtered.length} of {clients.length} clients</p>
        </div>
        <div className="flex gap-2">
          {isManagerial && (
            <Button variant="secondary" onClick={doExport}>
              <Download className="size-4" /> Export
            </Button>
          )}
          <Link href="/clients/new">
            <Button><Plus className="size-4" /> Add Client</Button>
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div ref={searchRef} className="min-w-60 flex-1">
            <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, passport, email, code…" />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="size-4" /> Filters
          </Button>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-5">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
              <option value="">All Statuses</option>
              {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority filter">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Lead source filter">
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Select value={nationality} onChange={(e) => setNationality(e.target.value)} aria-label="Nationality filter">
              <option value="">All Nationalities</option>
              {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
            </Select>
            {isManagerial && (
              <Select value={employee} onChange={(e) => setEmployee(e.target.value)} aria-label="Employee filter">
                <option value="">All Employees</option>
                {team.filter((t) => t.role === "employee").map((t) => (
                  <option key={t.uid} value={t.uid}>{t.name}</option>
                ))}
              </Select>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <TableSkeleton />
        ) : pageItems.length === 0 ? (
          <EmptyState
            title={clients.length === 0 ? "No clients yet" : "No clients match your search"}
            hint={clients.length === 0 ? "Add your first client to get started." : "Try adjusting the filters."}
            action={clients.length === 0 ? (
              <Link href="/clients/new"><Button><Plus className="size-4" /> Add Client</Button></Link>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="hidden px-4 py-3 md:table-cell">Nationality</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Priority</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Source</th>
                    {isManagerial && <th className="hidden px-4 py-3 xl:table-cell">Assigned To</th>}
                    <th className="hidden px-4 py-3 md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${c.id}`} className="group flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                            {initials(c.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold group-hover:text-primary">{c.name}</span>
                            <span className="block text-xs text-fg-faint">{c.clientCode}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap">{c.mobile}</p>
                        {c.email && <p className="max-w-44 truncate text-xs text-fg-muted">{c.email}</p>}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">{c.nationality || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="hidden px-4 py-3 lg:table-cell"><PriorityBadge priority={c.priority} /></td>
                      <td className="hidden px-4 py-3 text-fg-muted lg:table-cell">{c.leadSource}</td>
                      {isManagerial && (
                        <td className="hidden px-4 py-3 text-fg-muted xl:table-cell">{c.assignedEmployeeName || "—"}</td>
                      )}
                      <td className="hidden whitespace-nowrap px-4 py-3 text-fg-muted md:table-cell">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ClientsPageInner />
    </Suspense>
  );
}
