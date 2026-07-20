"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { app, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { fetchUsers, fetchClients, fetchSales, logAudit } from "@/lib/data";
import type { Client, Sale, UserProfile } from "@/lib/types";
import { AED, DEPARTMENTS } from "@/lib/constants";
import { initials, monthKey } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, TableSkeleton } from "@/components/ui";

export default function EmployeesPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = profile?.role === "admin";
  const thisMonth = monthKey();

  const emptyForm = {
    name: "", email: "", password: "", phone: "", role: "employee",
    department: "Sales", designation: "", employeeId: "", monthlyTarget: "", managerId: "", status: "active",
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    if (!profile) return;
    const [u, c, s] = await Promise.all([
      fetchUsers(),
      fetchClients(profile.role, profile.uid),
      fetchSales(profile.role, profile.uid),
    ]);
    setUsers(u); setClients(c); setSales(s); setLoading(false);
  };

  useEffect(() => { load(); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => users
    .filter((u) => u.role !== "admin" || isAdmin)
    .map((u) => {
      const myClients = clients.filter((c) => c.assignedEmployeeId === u.uid);
      const completed = myClients.filter((c) => c.status === "Completed").length;
      const revenue = sales
        .filter((s) => s.assignedEmployeeId === u.uid && s.saleDate?.startsWith(thisMonth))
        .reduce((t, s) => t + (s.revenue || s.invoiceAmount || 0), 0);
      return { ...u, clientCount: myClients.length, completed, pending: myClients.length - completed, revenue };
    }), [users, clients, sales, isAdmin, thisMonth]);

  const openEdit = (u: UserProfile) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, password: "", phone: u.phone ?? "",
      role: u.role, department: u.department ?? "Sales", designation: u.designation ?? "",
      employeeId: u.employeeId ?? "", monthlyTarget: String(u.monthlyTarget ?? ""),
      managerId: u.managerId ?? "", status: u.status,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      if (editing) {
        await setDoc(doc(db, "users", editing.uid), {
          name: form.name, phone: form.phone, role: form.role,
          department: form.department, designation: form.designation,
          employeeId: form.employeeId, managerId: form.managerId || "",
          monthlyTarget: form.monthlyTarget ? Number(form.monthlyTarget) : 0,
          status: form.status,
        }, { merge: true });
        await logAudit(profile, "update", "user", editing.uid, undefined, form.name);
        toast.success("Profile updated");
      } else {
        if (!form.password || form.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setBusy(false);
          return;
        }
        // Create the auth user in a secondary app so the admin stays signed in
        const secondary = initializeApp(app.options, "user-creation");
        try {
          const cred = await createUserWithEmailAndPassword(getAuth(secondary), form.email.trim(), form.password);
          await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            employeeId: form.employeeId || `EMP-${String(users.length + 1).padStart(3, "0")}`,
            name: form.name,
            email: form.email.trim(),
            phone: form.phone,
            role: form.role,
            department: form.department,
            designation: form.designation,
            managerId: form.managerId || "",
            monthlyTarget: form.monthlyTarget ? Number(form.monthlyTarget) : 0,
            status: "active",
            createdAt: serverTimestamp(),
          });
          await logAudit(profile, "create", "user", cred.user.uid, undefined, `${form.name} (${form.role})`);
          toast.success(`${form.name} added — share their login credentials securely`);
        } finally {
          await deleteApp(secondary);
        }
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      toast.error(code === "auth/email-already-in-use" ? "That email is already registered" : "Failed to save user");
    } finally {
      setBusy(false);
    }
  };

  // Employees may not view the team page (defense-in-depth; Firestore rules
  // also deny reading the staff directory to non-managers).
  if (profile && profile.role === "employee") {
    return (
      <div className="card">
        <EmptyState
          title="Access restricted"
          hint="The team page is available to managers and administrators only."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team</h1>
          <p className="text-sm text-fg-muted">Performance and workload across your team</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="size-4" /> Add User
          </Button>
        )}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState title="No team members" hint="Add employees to start assigning clients." /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="hidden px-4 py-3 md:table-cell">Department</th>
                <th className="px-4 py-3 text-right">Clients</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Completed</th>
                <th className="px-4 py-3 text-right">Revenue (This Month)</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Target</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => {
                const pct = u.monthlyTarget ? Math.min(100, Math.round((u.revenue / u.monthlyTarget) * 100)) : null;
                return (
                  <tr key={u.uid} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{u.name}</p>
                          <p className="truncate text-xs text-fg-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "admin" ? "danger" : u.role === "manager" ? "info" : "muted"}>
                        <span className="capitalize">{u.role}</span>
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-fg-muted md:table-cell">{u.department ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.clientCount}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{u.completed}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {AED.format(u.revenue)}
                      {pct !== null && <span className="ml-1 text-xs font-normal text-fg-faint">({pct}%)</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                      {u.monthlyTarget ? AED.format(u.monthlyTarget) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === "active" ? "success" : "muted"}>{u.status}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => openEdit(u)}>Edit</Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add User"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Email" required>
              <Input type="email" required value={form.email} disabled={!!editing} onChange={(e) => set("email", e.target.value)} />
            </Field>
            {!editing && (
              <Field label="Temporary Password" required hint="Minimum 6 characters — user should change it after first login">
                <Input type="text" required value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
            )}
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Employee ID">
              <Input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} placeholder="Auto-generated if empty" />
            </Field>
            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Designation">
              <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Sales Consultant" />
            </Field>
            <Field label="Reports To (Manager)">
              <Select value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
                <option value="">None</option>
                {users.filter((u) => u.role === "manager").map((m) => (
                  <option key={m.uid} value={m.uid}>{m.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly Target (AED)">
              <Input type="number" min="0" value={form.monthlyTarget} onChange={(e) => set("monthlyTarget", e.target.value)} />
            </Field>
            {editing && (
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? "Save Changes" : "Create User"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
