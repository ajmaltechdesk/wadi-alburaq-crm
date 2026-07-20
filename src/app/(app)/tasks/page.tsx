"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { addTask, fetchTasks, fetchUsers, updateTask, logAudit, pushNotification } from "@/lib/data";
import type { TaskItem, UserProfile } from "@/lib/types";
import { PRIORITIES } from "@/lib/constants";
import { fmtDate, todayStr } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Tabs, TableSkeleton, Textarea } from "@/components/ui";

export default function TasksPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = todayStr();

  const isManagerial = profile?.role === "admin" || profile?.role === "manager";

  const [form, setForm] = useState({
    name: "", description: "", notes: "", assignedTo: "", priority: "Medium",
    dueDate: todayStr(), recurring: "None",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchTasks(profile.role, profile.uid),
      isManagerial ? fetchUsers() : Promise.resolve([]),
    ]).then(([t, u]) => {
      setItems(t);
      setTeam(u.filter((x) => x.status === "active"));
      setLoading(false);
    });
  }, [profile, isManagerial]);

  const groups = useMemo(() => ({
    open: items.filter((t) => t.status === "Pending" || t.status === "In Progress"),
    overdue: items.filter((t) => (t.status === "Pending" || t.status === "In Progress") && t.dueDate < today),
    completed: items.filter((t) => t.status === "Completed"),
  }), [items, today]);

  const shown = groups[tab as keyof typeof groups] ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.name.trim()) return;
    setBusy(true);
    try {
      const assignee = isManagerial && form.assignedTo ? form.assignedTo : profile.uid;
      const assigneeName = team.find((t) => t.uid === assignee)?.name ?? profile.name;
      const id = await addTask({
        name: form.name,
        description: form.description || undefined,
        notes: form.notes || undefined,
        assignedTo: assignee,
        assignedToName: assigneeName,
        createdBy: profile.uid,
        priority: form.priority as TaskItem["priority"],
        dueDate: form.dueDate,
        status: "Pending",
        recurring: form.recurring as TaskItem["recurring"],
      });
      await logAudit(profile, "create", "task", id, undefined, form.name);
      if (assignee !== profile.uid) {
        await pushNotification(assignee, "task_due", "New task assigned",
          `${form.name} — due ${fmtDate(form.dueDate)}`, "/tasks");
      }
      toast.success("Task created");
      setOpen(false);
      setForm({ name: "", description: "", notes: "", assignedTo: "", priority: "Medium", dueDate: todayStr(), recurring: "None" });
      const t = await fetchTasks(profile.role, profile.uid);
      setItems(t);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (t: TaskItem, status: TaskItem["status"]) => {
    try {
      await updateTask(t.id, { status });
      if (profile) await logAudit(profile, "update", "task", t.id, t.status, status);
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tasks</h1>
          <p className="text-sm text-fg-muted">{groups.open.length} open · {groups.overdue.length} overdue</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New Task</Button>
      </div>

      <Tabs
        tabs={[
          { key: "open", label: "Open", count: groups.open.length },
          { key: "overdue", label: "Overdue", count: groups.overdue.length },
          { key: "completed", label: "Completed", count: groups.completed.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <TableSkeleton />
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState title="No tasks here" hint="Create a task to track your work." /></div>
      ) : (
        <div className="card divide-y divide-border p-0">
          {shown.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={t.status === "Completed"}
                onChange={() => setStatus(t, t.status === "Completed" ? "Pending" : "Completed")}
                className="size-4 cursor-pointer accent-(--color-accent)"
                aria-label={`Mark ${t.name} as ${t.status === "Completed" ? "pending" : "completed"}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${t.status === "Completed" ? "text-fg-faint line-through" : ""}`}>
                  {t.name}
                </p>
                <p className="text-xs text-fg-muted">
                  Due {fmtDate(t.dueDate)}
                  {t.assignedToName && isManagerial && ` · ${t.assignedToName}`}
                  {t.recurring && t.recurring !== "None" && ` · Repeats ${t.recurring}`}
                  {t.description && ` — ${t.description}`}
                </p>
              </div>
              <Badge tone={t.priority === "High" ? "danger" : t.priority === "Medium" ? "warning" : "muted"}>{t.priority}</Badge>
              {t.status !== "Completed" && t.dueDate < today && <Badge tone="danger">Overdue</Badge>}
              {t.status === "Pending" && (
                <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setStatus(t, "In Progress")}>
                  Start
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Task">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Task Name" required>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Prepare visa documents for…" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Due Date" required>
              <Input type="date" required value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Repeat">
              <Select value={form.recurring} onChange={(e) => set("recurring", e.target.value)}>
                <option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option>
              </Select>
            </Field>
            {isManagerial && (
              <Field label="Assign To">
                <Select value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
                  <option value="">Myself</option>
                  {team.map((t) => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Create Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
