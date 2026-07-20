"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarClock, FileText, Pencil, Phone, Plus, Trash2, Upload,
  Mail, MapPin, Globe, CreditCard, AlertTriangle, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  addDocumentMeta, addFollowUp, addRequirement, addSale, deleteDocumentMeta,
  fetchClient, fetchDocuments, fetchFollowUps, fetchRequirements, fetchSales,
  fetchAuditLogs, logAudit, updateFollowUp, updateRequirement,
} from "@/lib/data";
import type {
  Client, ClientDocument, DocumentType, FollowUp, Requirement, Sale, AuditLog,
} from "@/lib/types";
import {
  AED, DOCUMENT_TYPES, FOLLOWUP_MODES, PAYMENT_METHODS, PRIORITIES, SERVICE_TYPES, COUNTRIES,
} from "@/lib/constants";
import { cn, daysUntil, fileSizeLabel, fmtDate, fmtDateTime, todayStr } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Skeleton, Tabs, Textarea } from "@/components/ui";
import { PriorityBadge, StatusBadge } from "@/components/clients/StatusBadge";
import { ClientForm } from "@/components/clients/ClientForm";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("details");
  const [editOpen, setEditOpen] = useState(false);

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const c = await fetchClient(id);
      if (!c) { setNotFound(true); return; }
      setClient(c);
      const [r, d, f, s, l] = await Promise.all([
        fetchRequirements(id),
        fetchDocuments(id),
        fetchFollowUps(profile.role, profile.uid, id),
        fetchSales(profile.role, profile.uid, id),
        fetchAuditLogs(profile.role, profile.uid, 300),
      ]);
      setRequirements(r); setDocuments(d); setFollowups(f); setSales(s);
      setLogs(l.filter((x) => x.entityId === id));
    } catch {
      setNotFound(true); // permission denied ⇒ not the employee's client
    }
  }, [id, profile]);

  useEffect(() => { load(); }, [load]);

  if (notFound) {
    return (
      <EmptyState
        title="Client not found"
        hint="This client does not exist or you don't have access to it."
        action={<Link href="/clients"><Button variant="secondary">Back to clients</Button></Link>}
      />
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const passportDays = daysUntil(client.passportExpiry);

  return (
    <div className="animate-fade-up space-y-4">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-primary">
        <ArrowLeft className="size-4" /> Back to clients
      </Link>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#14477d] to-[#17847b] text-lg font-bold text-white">
              {client.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">{client.name}</h1>
              <p className="text-sm text-fg-muted">{client.clientCode} · Added {fmtDate(client.createdAt)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusBadge status={client.status} />
                <PriorityBadge priority={client.priority} />
                <Badge tone="muted">{client.leadSource}</Badge>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p className="flex items-center gap-2 text-fg-muted"><Phone className="size-4 shrink-0" /> {client.mobile}</p>
          {client.email && <p className="flex items-center gap-2 truncate text-fg-muted"><Mail className="size-4 shrink-0" /> {client.email}</p>}
          {client.nationality && <p className="flex items-center gap-2 text-fg-muted"><Globe className="size-4 shrink-0" /> {client.nationality}</p>}
          {client.currentLocation && <p className="flex items-center gap-2 text-fg-muted"><MapPin className="size-4 shrink-0" /> {client.currentLocation}</p>}
        </div>

        {passportDays !== null && passportDays < 180 && (
          <div className={cn(
            "mt-3 flex items-center gap-2 rounded-lg p-3 text-sm font-medium",
            passportDays < 30 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
          )}>
            <AlertTriangle className="size-4 shrink-0" />
            Passport {passportDays < 0 ? `expired ${-passportDays} days ago` : `expires in ${passportDays} days`} ({fmtDate(client.passportExpiry)})
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          { key: "details", label: "Details" },
          { key: "requirements", label: "Requirements", count: requirements.length },
          { key: "documents", label: "Documents", count: documents.length },
          { key: "payments", label: "Payments", count: sales.length },
          { key: "followups", label: "Follow-ups", count: followups.length },
          { key: "timeline", label: "Timeline" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "details" && <DetailsTab client={client} />}
      {tab === "requirements" && <RequirementsTab clientId={id} client={client} items={requirements} onChange={load} />}
      {tab === "documents" && <DocumentsTab clientId={id} client={client} items={documents} onChange={load} />}
      {tab === "payments" && <PaymentsTab clientId={id} client={client} items={sales} onChange={load} />}
      {tab === "followups" && <FollowupsTab clientId={id} client={client} items={followups} onChange={load} />}
      {tab === "timeline" && <TimelineTab logs={logs} followups={followups} sales={sales} documents={documents} />}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client" wide>
        <ClientForm
          client={client}
          onSaved={() => { setEditOpen(false); load(); router.refresh(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}

/* ---------------- Details ---------------- */
function DetailsTab({ client }: { client: Client }) {
  const rows: [string, string | undefined][] = [
    ["Gender", client.gender],
    ["Date of Birth", client.dateOfBirth ? fmtDate(client.dateOfBirth) : undefined],
    ["Nationality", client.nationality],
    ["Country of Residence", client.countryOfResidence],
    ["WhatsApp", client.whatsapp],
    ["Passport Number", client.passportNumber],
    ["Passport Expiry", client.passportExpiry ? fmtDate(client.passportExpiry) : undefined],
    ["Visa Status", client.visaStatus],
    ["Preferred Language", client.preferredLanguage],
    ["Lead Source", client.leadSource],
    ["Assigned To", client.assignedEmployeeName],
    ["Assigned By", client.assignedBy],
    ["Assigned Date", client.assignedDate ? fmtDate(client.assignedDate) : undefined],
  ];
  return (
    <div className="card p-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-fg-faint">{label}</dt>
            <dd className="mt-0.5 font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {client.remarks && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">Remarks</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{client.remarks}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Requirements ---------------- */
function RequirementsTab({ clientId, client, items, onChange }: {
  clientId: string; client: Client; items: Requirement[]; onChange: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    serviceType: SERVICE_TYPES[0], destinationCountry: "", travelDate: "", returnDate: "",
    travellers: "1", budget: "", details: "", expectedClosingDate: "",
    priority: "Medium", status: "Open", employeeNotes: "", internalNotes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      await addRequirement(clientId, {
        clientId,
        assignedEmployeeId: client.assignedEmployeeId,
        serviceType: form.serviceType,
        destinationCountry: form.destinationCountry || undefined,
        travelDate: form.travelDate || undefined,
        returnDate: form.returnDate || undefined,
        travellers: form.travellers ? Number(form.travellers) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        details: form.details || undefined,
        expectedClosingDate: form.expectedClosingDate || undefined,
        priority: form.priority as Requirement["priority"],
        status: form.status as Requirement["status"],
        employeeNotes: form.employeeNotes || undefined,
        internalNotes: form.internalNotes || undefined,
      });
      await logAudit(profile, "create", "requirement", clientId, undefined, form.serviceType);
      toast.success("Requirement added");
      setOpen(false);
      onChange();
    } catch {
      toast.error("Failed to add requirement");
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (s: Requirement["status"]) =>
    s === "Won" ? "success" : s === "Lost" ? "danger" : s === "In Progress" ? "info" : s === "On Hold" ? "warning" : "muted";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add Requirement</Button>
      </div>
      {items.length === 0 ? (
        <div className="card"><EmptyState title="No requirements yet" hint="Record what this client needs — visa, tickets, packages…" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{r.serviceType}</p>
                  <p className="text-xs text-fg-muted">{fmtDate(r.createdAt)}{r.destinationCountry && ` · ${r.destinationCountry}`}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  <PriorityBadge priority={r.priority} />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {r.travelDate && <div><dt className="text-xs text-fg-faint">Travel</dt><dd>{fmtDate(r.travelDate)}{r.returnDate && ` → ${fmtDate(r.returnDate)}`}</dd></div>}
                {r.travellers != null && <div><dt className="text-xs text-fg-faint">Travellers</dt><dd>{r.travellers}</dd></div>}
                {r.budget != null && <div><dt className="text-xs text-fg-faint">Budget</dt><dd>{AED.format(r.budget)}</dd></div>}
                {r.expectedClosingDate && <div><dt className="text-xs text-fg-faint">Expected Closing</dt><dd>{fmtDate(r.expectedClosingDate)}</dd></div>}
              </dl>
              {r.details && <p className="mt-2 text-sm text-fg-muted">{r.details}</p>}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                {(["Open", "In Progress", "Won", "Lost"] as const).filter((s) => s !== r.status).map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      await updateRequirement(clientId, r.id, { status: s });
                      if (profile) await logAudit(profile, "update", "requirement", clientId, r.status, s);
                      onChange();
                    }}
                    className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Requirement" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service Type" required>
              <Select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)}>
                {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Destination Country">
              <Select value={form.destinationCountry} onChange={(e) => set("destinationCountry", e.target.value)}>
                <option value="">Select…</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Travel Date"><Input type="date" value={form.travelDate} onChange={(e) => set("travelDate", e.target.value)} /></Field>
            <Field label="Return Date"><Input type="date" value={form.returnDate} onChange={(e) => set("returnDate", e.target.value)} /></Field>
            <Field label="Number of Travellers"><Input type="number" min="1" value={form.travellers} onChange={(e) => set("travellers", e.target.value)} /></Field>
            <Field label="Budget (AED)"><Input type="number" min="0" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
            <Field label="Expected Closing Date"><Input type="date" value={form.expectedClosingDate} onChange={(e) => set("expectedClosingDate", e.target.value)} /></Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Requirement Details">
            <Textarea value={form.details} onChange={(e) => set("details", e.target.value)} placeholder="Describe exactly what the client needs…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee Notes"><Textarea value={form.employeeNotes} onChange={(e) => set("employeeNotes", e.target.value)} /></Field>
            <Field label="Internal Notes"><Textarea value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Add Requirement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Documents ---------------- */
function DocumentsTab({ clientId, client, items, onChange }: {
  clientId: string; client: Client; items: ClientDocument[]; onChange: () => void;
}) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("Passport");
  const [preview, setPreview] = useState<ClientDocument | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const ACCEPTED = [
    "application/pdf", "image/jpeg", "image/png", "image/webp",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const handleFiles = async (files: FileList | File[]) => {
    if (!profile) return;
    const list = Array.from(files);
    setUploading(true);
    try {
      for (const file of list) {
        if (!ACCEPTED.includes(file.type)) {
          toast.error(`${file.name}: unsupported file type`);
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name}: exceeds 20 MB limit`);
          continue;
        }
        const path = `clients/${clientId}/${Date.now()}-${file.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file, { contentType: file.type });
        const url = await getDownloadURL(ref);
        await addDocumentMeta(clientId, {
          clientId,
          assignedEmployeeId: client.assignedEmployeeId,
          type: docType,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath: path,
          downloadURL: url,
          uploadedBy: profile.uid,
          uploadedByName: profile.name,
        });
        await logAudit(profile, "upload", "document", clientId, undefined, file.name);
      }
      toast.success("Upload complete");
      onChange();
    } catch {
      toast.error("Upload failed — check your connection and permissions");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (d: ClientDocument) => {
    if (!profile) return;
    if (!confirm(`Delete ${d.fileName}? This cannot be undone.`)) return;
    try {
      await deleteObject(storageRef(storage, d.storagePath)).catch(() => {});
      await deleteDocumentMeta(clientId, d.id);
      await logAudit(profile, "delete", "document", clientId, d.fileName, undefined);
      toast.success("Document deleted");
      onChange();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Document Type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} className="w-48">
              {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <label className={cn(
            "flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover dark:text-[#0b1421]",
            uploading && "pointer-events-none opacity-60"
          )}>
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Choose Files"}
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </label>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "mt-3 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors",
            dragOver ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-faint"
          )}
        >
          Drag & drop files here — PDF, Word, Excel or images (max 20 MB each)
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState title="No documents uploaded" hint="Upload passports, visas, tickets and invoices here." /></div>
      ) : (
        <div className="card divide-y divide-border p-0">
          {items.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded-lg bg-primary-soft p-2 text-primary"><FileText className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.fileName}</p>
                <p className="text-xs text-fg-muted">
                  {d.type} · {fileSizeLabel(d.fileSize)} · {d.uploadedByName} · {fmtDateTime(d.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setPreview(d)}
                className="cursor-pointer rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-primary"
                aria-label={`Preview ${d.fileName}`}
              >
                <Eye className="size-4" />
              </button>
              <button
                onClick={() => remove(d)}
                className="cursor-pointer rounded-lg p-2 text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label={`Delete ${d.fileName}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.fileName ?? "Preview"} wide>
        {preview && (
          <div className="space-y-3">
            {preview.fileType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.downloadURL} alt={preview.fileName} className="max-h-[70dvh] w-full rounded-lg object-contain" />
            ) : preview.fileType === "application/pdf" ? (
              <iframe src={preview.downloadURL} title={preview.fileName} className="h-[70dvh] w-full rounded-lg border border-border" />
            ) : (
              <p className="py-8 text-center text-sm text-fg-muted">
                Preview not available for this file type — use download instead.
              </p>
            )}
            <div className="flex justify-end">
              <a href={preview.downloadURL} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">Download</Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Payments / Sales ---------------- */
function PaymentsTab({ clientId, client, items, onChange }: {
  clientId: string; client: Client; items: Sale[]; onChange: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    serviceType: SERVICE_TYPES[0], quotationAmount: "", invoiceAmount: "", advancePayment: "0",
    paymentMethod: PAYMENT_METHODS[0], invoiceNumber: "", saleDate: todayStr(),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const totals = useMemo(() => ({
    invoiced: items.reduce((s, x) => s + (x.invoiceAmount || 0), 0),
    received: items.reduce((s, x) => s + (x.advancePayment || 0), 0),
    balance: items.reduce((s, x) => s + (x.balance || 0), 0),
  }), [items]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const invoice = Number(form.invoiceAmount) || 0;
    const advance = Number(form.advancePayment) || 0;
    if (invoice <= 0) { toast.error("Invoice amount must be greater than zero"); return; }
    setBusy(true);
    try {
      await addSale({
        clientId,
        clientName: client.name,
        assignedEmployeeId: client.assignedEmployeeId,
        employeeName: client.assignedEmployeeName,
        serviceType: form.serviceType,
        quotationAmount: form.quotationAmount ? Number(form.quotationAmount) : undefined,
        invoiceAmount: invoice,
        advancePayment: advance,
        balance: invoice - advance,
        revenue: invoice,
        paymentStatus: advance >= invoice ? "Paid" : advance > 0 ? "Partial" : "Pending",
        paymentMethod: form.paymentMethod,
        invoiceNumber: form.invoiceNumber || undefined,
        saleDate: form.saleDate,
      });
      await logAudit(profile, "create", "sale", clientId, undefined, `${form.serviceType} ${AED.format(invoice)}`);
      toast.success("Sale recorded");
      setOpen(false);
      onChange();
    } catch {
      toast.error("Failed to record sale");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs font-semibold text-fg-muted">Total Invoiced</p><p className="mt-1 text-lg font-bold tabular-nums">{AED.format(totals.invoiced)}</p></div>
        <div className="card p-4"><p className="text-xs font-semibold text-fg-muted">Received</p><p className="mt-1 text-lg font-bold tabular-nums text-success">{AED.format(totals.received)}</p></div>
        <div className="card p-4"><p className="text-xs font-semibold text-fg-muted">Balance Due</p><p className="mt-1 text-lg font-bold tabular-nums text-warning">{AED.format(totals.balance)}</p></div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Record Sale</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState title="No payments recorded" hint="Record quotations, invoices and payments here." /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-bold uppercase tracking-wide text-fg-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3 text-right">Invoice</th>
                <th className="px-4 py-3 text-right">Advance</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(s.saleDate)}</td>
                  <td className="px-4 py-3">{s.serviceType}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{AED.format(s.invoiceAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{AED.format(s.advancePayment)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{AED.format(s.balance)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.paymentStatus === "Paid" ? "success" : s.paymentStatus === "Partial" ? "warning" : "danger"}>
                      {s.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{s.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record Sale">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Service" required>
            <Select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)}>
              {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quotation (AED)"><Input type="number" min="0" value={form.quotationAmount} onChange={(e) => set("quotationAmount", e.target.value)} /></Field>
            <Field label="Invoice Amount (AED)" required><Input type="number" min="0" required value={form.invoiceAmount} onChange={(e) => set("invoiceAmount", e.target.value)} /></Field>
            <Field label="Advance Payment (AED)"><Input type="number" min="0" value={form.advancePayment} onChange={(e) => set("advancePayment", e.target.value)} /></Field>
            <Field label="Payment Method">
              <Select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Invoice Number"><Input value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} /></Field>
            <Field label="Sale Date" required><Input type="date" required value={form.saleDate} onChange={(e) => set("saleDate", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save Sale</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Follow-ups ---------------- */
function FollowupsTab({ clientId, client, items, onChange }: {
  clientId: string; client: Client; items: FollowUp[]; onChange: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    date: todayStr(), time: "10:00", mode: "Call", notes: "", nextFollowUpDate: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      await addFollowUp({
        clientId,
        clientName: client.name,
        assignedEmployeeId: client.assignedEmployeeId,
        date: form.date,
        time: form.time,
        mode: form.mode as FollowUp["mode"],
        notes: form.notes || undefined,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        status: "Pending",
      });
      await logAudit(profile, "create", "followup", clientId, undefined, `${form.mode} on ${form.date}`);
      toast.success("Follow-up scheduled");
      setOpen(false);
      onChange();
    } catch {
      toast.error("Failed to schedule follow-up");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><CalendarClock className="size-4" /> Schedule Follow-up</Button>
      </div>
      {items.length === 0 ? (
        <div className="card"><EmptyState title="No follow-ups yet" hint="Schedule a call, WhatsApp or meeting reminder." /></div>
      ) : (
        <div className="card divide-y divide-border p-0">
          {items.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{f.mode} — {fmtDate(f.date)} at {f.time}</p>
                {f.notes && <p className="text-xs text-fg-muted">{f.notes}</p>}
                {f.outcome && <p className="mt-0.5 text-xs text-success">Outcome: {f.outcome}</p>}
              </div>
              <Badge tone={f.status === "Done" ? "success" : f.status === "Missed" ? "danger" : f.status === "Cancelled" ? "muted" : "warning"}>
                {f.status}
              </Badge>
              {f.status === "Pending" && (
                <button
                  onClick={async () => {
                    const outcome = prompt("Outcome of this follow-up?") ?? "";
                    await updateFollowUp(f.id, { status: "Done", outcome });
                    if (profile) await logAudit(profile, "update", "followup", clientId, "Pending", "Done");
                    onChange();
                  }}
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-semibold text-fg-muted transition-colors hover:bg-success-soft hover:text-success"
                >
                  Mark Done
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Follow-up">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required><Input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Time" required><Input type="time" required value={form.time} onChange={(e) => set("time", e.target.value)} /></Field>
          </div>
          <Field label="Mode">
            <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              {FOLLOWUP_MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What should be discussed?" /></Field>
          <Field label="Next Follow-up (optional)"><Input type="date" value={form.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} /></Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Timeline ---------------- */
function TimelineTab({ logs, followups, sales, documents }: {
  logs: AuditLog[]; followups: FollowUp[]; sales: Sale[]; documents: ClientDocument[];
}) {
  const events = useMemo(() => {
    const list: { at: number; icon: React.ReactNode; label: string; sub?: string }[] = [];
    const ts = (t?: { toMillis?: () => number }) => (t?.toMillis ? t.toMillis() : 0);
    logs.forEach((l) => list.push({
      at: ts(l.createdAt),
      icon: <Pencil className="size-3.5" />,
      label: `${l.userName} ${l.action}d ${l.entity}`,
      sub: l.previousValue && l.updatedValue ? `${l.previousValue} → ${l.updatedValue}` : l.updatedValue || undefined,
    }));
    followups.forEach((f) => list.push({
      at: ts(f.createdAt), icon: <Phone className="size-3.5" />,
      label: `Follow-up scheduled (${f.mode})`, sub: `${fmtDate(f.date)} at ${f.time} — ${f.status}`,
    }));
    sales.forEach((s) => list.push({
      at: ts(s.createdAt), icon: <CreditCard className="size-3.5" />,
      label: `Sale recorded — ${s.serviceType}`, sub: AED.format(s.invoiceAmount),
    }));
    documents.forEach((d) => list.push({
      at: ts(d.createdAt), icon: <FileText className="size-3.5" />,
      label: `Document uploaded — ${d.type}`, sub: d.fileName,
    }));
    return list.sort((a, b) => b.at - a.at);
  }, [logs, followups, sales, documents]);

  if (events.length === 0) {
    return <div className="card"><EmptyState title="No activity yet" hint="Actions on this client will appear here chronologically." /></div>;
  }

  return (
    <div className="card p-5">
      <ol className="relative space-y-5 border-l-2 border-border pl-6">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-surface">
              {e.icon}
            </span>
            <p className="text-sm font-semibold">{e.label}</p>
            {e.sub && <p className="text-xs text-fg-muted">{e.sub}</p>}
            <p className="mt-0.5 text-[11px] text-fg-faint">{e.at ? fmtDateTime(new Date(e.at)) : ""}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
