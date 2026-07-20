"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { fetchSettings, saveSettings, logAudit } from "@/lib/data";
import { COMPANY_NAME, LEAD_SOURCES, SERVICE_TYPES, DEPARTMENTS } from "@/lib/constants";
import { Button, EmptyState, Field, Input, Skeleton, Tabs, Textarea } from "@/components/ui";

type Lists = {
  services: string[];
  leadSources: string[];
  departments: string[];
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("lists");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lists, setLists] = useState<Lists>({
    services: SERVICE_TYPES,
    leadSources: LEAD_SOURCES,
    departments: DEPARTMENTS,
  });
  const [company, setCompany] = useState({
    companyName: COMPANY_NAME, companyPhone: "", companyEmail: "", companyAddress: "",
  });
  const [templates, setTemplates] = useState({
    whatsappGreeting: "Hello {{name}}, thank you for contacting Wadi Al Buraq Tourism! How can we assist you today?",
    whatsappFollowup: "Hello {{name}}, this is a friendly follow-up regarding your {{service}} enquiry. Please let us know if you have any questions.",
    emailQuotation: "Dear {{name}},\n\nPlease find attached your quotation for {{service}}.\n\nBest regards,\nWadi Al Buraq Tourism L.L.C.",
  });
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    fetchSettings().then((s) => {
      if (s) {
        setLists((prev) => ({
          services: (s.services as string[]) ?? prev.services,
          leadSources: (s.leadSources as string[]) ?? prev.leadSources,
          departments: (s.departments as string[]) ?? prev.departments,
        }));
        setCompany((prev) => ({
          companyName: (s.companyName as string) ?? prev.companyName,
          companyPhone: (s.companyPhone as string) ?? "",
          companyEmail: (s.companyEmail as string) ?? "",
          companyAddress: (s.companyAddress as string) ?? "",
        }));
        if (s.templates) setTemplates((prev) => ({ ...prev, ...(s.templates as typeof templates) }));
      }
      setLoading(false);
    });
  }, []);

  if (!isAdmin) {
    return <div className="card"><EmptyState title="Admins only" hint="System settings can only be changed by administrators." /></div>;
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await saveSettings({ ...lists, ...company, templates });
      await logAudit(profile, "update", "settings", "app");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  const ListEditor = ({ id, title, items }: { id: keyof Lists; title: string; items: string[] }) => (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm">
            {item}
            <button
              onClick={() => setLists((l) => ({ ...l, [id]: l[id].filter((x) => x !== item) }))}
              className="cursor-pointer rounded-full p-0.5 text-fg-faint transition-colors hover:bg-danger-soft hover:text-danger"
              aria-label={`Remove ${item}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = (newItem[id] ?? "").trim();
          if (!v || items.includes(v)) return;
          setLists((l) => ({ ...l, [id]: [...l[id], v] }));
          setNewItem((n) => ({ ...n, [id]: "" }));
        }}
        className="flex gap-2"
      >
        <Input
          value={newItem[id] ?? ""}
          onChange={(e) => setNewItem((n) => ({ ...n, [id]: e.target.value }))}
          placeholder={`Add new ${title.toLowerCase().replace(/s$/, "")}…`}
        />
        <Button type="submit" variant="secondary"><Plus className="size-4" /></Button>
      </form>
    </div>
  );

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-fg-muted">Configure services, sources, company details and templates</p>
        </div>
        <Button onClick={save} loading={busy}>Save All Changes</Button>
      </div>

      <Tabs
        tabs={[
          { key: "lists", label: "Master Lists" },
          { key: "company", label: "Company Details" },
          { key: "templates", label: "Message Templates" },
          { key: "backup", label: "Backup & Restore" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "lists" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ListEditor id="services" title="Services" items={lists.services} />
          <div className="space-y-4">
            <ListEditor id="leadSources" title="Lead Sources" items={lists.leadSources} />
            <ListEditor id="departments" title="Departments" items={lists.departments} />
          </div>
        </div>
      )}

      {tab === "company" && (
        <div className="card max-w-xl space-y-4 p-5">
          <Field label="Company Name">
            <Input value={company.companyName} onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={company.companyPhone} onChange={(e) => setCompany((c) => ({ ...c, companyPhone: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input type="email" value={company.companyEmail} onChange={(e) => setCompany((c) => ({ ...c, companyEmail: e.target.value }))} />
          </Field>
          <Field label="Address">
            <Textarea value={company.companyAddress} onChange={(e) => setCompany((c) => ({ ...c, companyAddress: e.target.value }))} />
          </Field>
        </div>
      )}

      {tab === "templates" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-4 p-5">
            <h3 className="text-sm font-bold">WhatsApp Templates</h3>
            <Field label="Greeting" hint="Use {{name}} and {{service}} as placeholders">
              <Textarea value={templates.whatsappGreeting} onChange={(e) => setTemplates((t) => ({ ...t, whatsappGreeting: e.target.value }))} />
            </Field>
            <Field label="Follow-up">
              <Textarea value={templates.whatsappFollowup} onChange={(e) => setTemplates((t) => ({ ...t, whatsappFollowup: e.target.value }))} />
            </Field>
          </div>
          <div className="card space-y-4 p-5">
            <h3 className="text-sm font-bold">Email Templates</h3>
            <Field label="Quotation Email">
              <Textarea className="min-h-40" value={templates.emailQuotation} onChange={(e) => setTemplates((t) => ({ ...t, emailQuotation: e.target.value }))} />
            </Field>
          </div>
        </div>
      )}

      {tab === "backup" && (
        <div className="card max-w-xl space-y-4 p-5">
          <h3 className="text-sm font-bold">Backup & Restore</h3>
          <p className="text-sm text-fg-muted">
            Firestore data is automatically replicated by Google Cloud. For scheduled point-in-time
            exports, enable the <strong>Firestore scheduled backups</strong> feature in your Firebase
            console (Firestore → Disaster Recovery), or use
            <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">gcloud firestore export</code>
            to a Cloud Storage bucket on a Cloud Scheduler cron.
          </p>
          <p className="text-sm text-fg-muted">
            You can also export any table from the Reports page as CSV/Excel at any time for an
            offline copy.
          </p>
        </div>
      )}
    </div>
  );
}
