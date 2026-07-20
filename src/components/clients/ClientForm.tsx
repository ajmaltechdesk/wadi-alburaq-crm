"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { createClient, updateClient, findDuplicates, logAudit, fetchUsers, pushNotification } from "@/lib/data";
import type { Client, ClientStatus, Priority, UserProfile } from "@/lib/types";
import {
  CLIENT_STATUSES, COUNTRIES, LANGUAGES, LEAD_SOURCES, NATIONALITIES, PRIORITIES,
} from "@/lib/constants";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

export function ClientForm({
  client,
  onSaved,
  onCancel,
}: {
  client?: Client;
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const { profile } = useAuth();
  const isManagerial = profile?.role === "admin" || profile?.role === "manager";
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dupes, setDupes] = useState<Client[]>([]);

  const [form, setForm] = useState({
    name: client?.name ?? "",
    gender: client?.gender ?? "",
    dateOfBirth: client?.dateOfBirth ?? "",
    nationality: client?.nationality ?? "",
    countryOfResidence: client?.countryOfResidence ?? "United Arab Emirates",
    mobile: client?.mobile ?? "",
    whatsapp: client?.whatsapp ?? "",
    email: client?.email ?? "",
    passportNumber: client?.passportNumber ?? "",
    passportExpiry: client?.passportExpiry ?? "",
    visaStatus: client?.visaStatus ?? "",
    currentLocation: client?.currentLocation ?? "",
    preferredLanguage: client?.preferredLanguage ?? "English",
    leadSource: client?.leadSource ?? "Walk-In",
    priority: (client?.priority ?? "Medium") as Priority,
    status: (client?.status ?? "New") as ClientStatus,
    remarks: client?.remarks ?? "",
    assignedEmployeeId: client?.assignedEmployeeId ?? profile?.uid ?? "",
  });

  useEffect(() => {
    if (isManagerial) fetchUsers().then((u) => setTeam(u.filter((x) => x.status === "active")));
  }, [isManagerial]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Live duplicate detection on identity fields
  useEffect(() => {
    if (!profile) return;
    const { mobile, email, passportNumber, whatsapp } = form;
    if (!mobile && !email && !passportNumber && !whatsapp) { setDupes([]); return; }
    const t = setTimeout(async () => {
      try {
        const found = await findDuplicates(profile.role, profile.uid, {
          mobile: mobile || undefined,
          email: email || undefined,
          passportNumber: passportNumber || undefined,
          whatsapp: whatsapp || undefined,
        });
        setDupes(found.filter((c) => c.id !== client?.id));
      } catch { /* index may still be building */ }
    }, 600);
    return () => clearTimeout(t);
  }, [form.mobile, form.email, form.passportNumber, form.whatsapp, profile, client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.error("Client name and mobile number are required.");
      return;
    }
    setBusy(true);
    try {
      const assignee = isManagerial ? form.assignedEmployeeId : profile.uid;
      const assigneeName =
        team.find((t) => t.uid === assignee)?.name ??
        (assignee === profile.uid ? profile.name : "");

      if (client) {
        const statusChanged = client.status !== form.status;
        const reassigned = client.assignedEmployeeId !== assignee;
        await updateClient(client.id, {
          ...form,
          gender: (form.gender || undefined) as Client["gender"],
          assignedEmployeeId: assignee,
          assignedEmployeeName: assigneeName,
          ...(reassigned && {
            assignedBy: profile.name,
            assignedDate: serverTimestamp() as unknown as Timestamp,
          }),
        });
        await logAudit(profile, "update", "client", client.id,
          statusChanged ? client.status : undefined,
          statusChanged ? form.status : undefined);
        if (reassigned && assignee !== profile.uid) {
          await pushNotification(assignee, "client_assigned", "Client assigned to you",
            `${form.name} has been assigned to you by ${profile.name}`, `/clients/${client.id}`);
        }
        toast.success("Client updated");
        onSaved(client.id);
      } else {
        const id = await createClient({
          ...form,
          gender: (form.gender || undefined) as Client["gender"],
          nameLower: form.name.toLowerCase(),
          assignedEmployeeId: assignee,
          assignedEmployeeName: assigneeName,
          assignedBy: profile.name,
          assignedDate: serverTimestamp() as unknown as Timestamp,
          createdBy: profile.uid,
        });
        await logAudit(profile, "create", "client", id, undefined, form.name);
        if (assignee !== profile.uid) {
          await pushNotification(assignee, "client_assigned", "New client assigned",
            `${form.name} has been assigned to you`, `/clients/${id}`);
        }
        toast.success("Client added");
        onSaved(id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save client. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {dupes.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Possible duplicate client</p>
            <ul className="mt-1 text-fg-muted">
              {dupes.map((d) => (
                <li key={d.id}>{d.clientCode} — {d.name} ({d.mobile})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Ahmed Khan" />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Select…</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </Select>
        </Field>
        <Field label="Date of Birth">
          <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <Select value={form.nationality} onChange={(e) => set("nationality", e.target.value)}>
            <option value="">Select…</option>
            {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label="Country of Residence">
          <Select value={form.countryOfResidence} onChange={(e) => set("countryOfResidence", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Current Location">
          <Input value={form.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} placeholder="e.g. Dubai" />
        </Field>
        <Field label="Mobile Number" required>
          <Input type="tel" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required placeholder="+971 5x xxx xxxx" />
        </Field>
        <Field label="WhatsApp Number">
          <Input type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+971 5x xxx xxxx" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@email.com" />
        </Field>
        <Field label="Preferred Language">
          <Select value={form.preferredLanguage} onChange={(e) => set("preferredLanguage", e.target.value)}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Passport Number">
          <Input value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Passport Expiry">
          <Input type="date" value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} />
        </Field>
        <Field label="Current Visa Status">
          <Input value={form.visaStatus} onChange={(e) => set("visaStatus", e.target.value)} placeholder="e.g. Visit visa expiring 15 Aug" />
        </Field>
        <Field label="Lead Source">
          <Select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}>
            {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        {isManagerial && (
          <Field label="Assigned Employee">
            <Select value={form.assignedEmployeeId} onChange={(e) => set("assignedEmployeeId", e.target.value)}>
              {team.map((t) => (
                <option key={t.uid} value={t.uid}>{t.name} ({t.role})</option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Remarks">
        <Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any additional notes about this client…" />
      </Field>

      <div className="flex justify-end gap-3">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={busy}>{client ? "Save Changes" : "Add Client"}</Button>
      </div>
    </form>
  );
}
