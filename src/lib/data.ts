"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AppNotification,
  AuditLog,
  Client,
  ClientDocument,
  FollowUp,
  NotificationType,
  Requirement,
  Role,
  Sale,
  TaskItem,
  UserProfile,
} from "./types";
import { nextClientCode } from "./utils";

export const col = {
  users: () => collection(db, "users"),
  clients: () => collection(db, "clients"),
  requirements: (clientId: string) => collection(db, "clients", clientId, "requirements"),
  documents: (clientId: string) => collection(db, "clients", clientId, "documents"),
  followups: () => collection(db, "followups"),
  tasks: () => collection(db, "tasks"),
  sales: () => collection(db, "sales"),
  notifications: () => collection(db, "notifications"),
  auditLogs: () => collection(db, "auditLogs"),
};

function snapToList<T>(snap: { docs: { id: string; data: () => unknown }[] }): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}

/** Role-aware constraint: employees only ever query their own records. */
export function scopeToUser(role: Role, uid: string): QueryConstraint[] {
  return role === "employee" ? [where("assignedEmployeeId", "==", uid)] : [];
}

// ---------- Users ----------
export async function fetchUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(col.users(), orderBy("name")));
  return snapToList<UserProfile>(snap).map((u) => ({ ...u, uid: u.uid ?? (u as unknown as { id: string }).id }));
}

export async function fetchUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
}

// ---------- Clients ----------
/** Millisecond value of a Firestore Timestamp (or 0) for client-side sorting. */
function ms(t: unknown): number {
  return t && typeof (t as { toMillis?: () => number }).toMillis === "function"
    ? (t as { toMillis: () => number }).toMillis()
    : 0;
}

// NOTE: employee-scoped reads use `where(...)` only (no `orderBy`) so they do
// NOT require a Firestore composite index. Results are sorted in memory below.
export async function fetchClients(role: Role, uid: string): Promise<Client[]> {
  const snap = await getDocs(query(col.clients(), ...scopeToUser(role, uid)));
  return snapToList<Client>(snap).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

export async function fetchClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, "clients", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Client) : null;
}

/** Duplicate detection across phone / email / passport / whatsapp — scoped by role. */
export async function findDuplicates(
  role: Role,
  uid: string,
  fields: { mobile?: string; email?: string; passportNumber?: string; whatsapp?: string }
): Promise<Client[]> {
  const scope = scopeToUser(role, uid);
  const checks: Promise<Client[]>[] = [];
  const run = (field: string, value: string) =>
    getDocs(query(col.clients(), ...scope, where(field, "==", value), fbLimit(3))).then((s) =>
      snapToList<Client>(s)
    );
  if (fields.mobile) checks.push(run("mobile", fields.mobile));
  if (fields.whatsapp) checks.push(run("whatsapp", fields.whatsapp));
  if (fields.email) checks.push(run("email", fields.email));
  if (fields.passportNumber) checks.push(run("passportNumber", fields.passportNumber));
  const results = (await Promise.all(checks)).flat();
  const seen = new Set<string>();
  return results.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

/** Create a client with an atomic auto-incrementing client code. */
export async function createClient(
  data: Omit<Client, "id" | "clientCode" | "createdAt" | "updatedAt">
): Promise<string> {
  const counterRef = doc(db, "counters", "clients");
  const clientRef = doc(col.clients());
  await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const seq = ((counter.data()?.seq as number) ?? 0) + 1;
    tx.set(counterRef, { seq }, { merge: true });
    tx.set(clientRef, {
      ...data,
      nameLower: data.name.toLowerCase(),
      clientCode: nextClientCode(seq),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return clientRef.id;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const patch: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.name) patch.nameLower = data.name.toLowerCase();
  await updateDoc(doc(db, "clients", id), patch);
}

/**
 * Bulk-create clients (Excel/CSV import). Reserves a contiguous block of client
 * codes in one transaction, then writes rows in batches of 400. Admin-only —
 * enforced by Firestore rules (managers/admins may create any assignment).
 */
export type ClientDraft = Omit<
  Client,
  "id" | "clientCode" | "nameLower" | "createdAt" | "updatedAt" | "assignedDate"
>;

export async function bulkCreateClients(drafts: ClientDraft[]): Promise<number> {
  if (!drafts.length) return 0;

  const counterRef = doc(db, "counters", "clients");
  let startSeq = 0;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    startSeq = (snap.data()?.seq as number) ?? 0;
    tx.set(counterRef, { seq: startSeq + drafts.length }, { merge: true });
  });

  const CHUNK = 400;
  for (let i = 0; i < drafts.length; i += CHUNK) {
    const batch = writeBatch(db);
    drafts.slice(i, i + CHUNK).forEach((d, j) => {
      const ref = doc(col.clients());
      batch.set(ref, {
        ...d,
        nameLower: d.name.toLowerCase(),
        clientCode: nextClientCode(startSeq + i + j + 1),
        assignedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
  return drafts.length;
}

// ---------- Requirements ----------
export async function fetchRequirements(clientId: string): Promise<Requirement[]> {
  const snap = await getDocs(query(col.requirements(clientId), orderBy("createdAt", "desc")));
  return snapToList<Requirement>(snap);
}

export async function addRequirement(
  clientId: string,
  data: Omit<Requirement, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(col.requirements(clientId), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateRequirement(
  clientId: string,
  id: string,
  data: Partial<Requirement>
): Promise<void> {
  await updateDoc(doc(db, "clients", clientId, "requirements", id), data);
}

// ---------- Documents ----------
export async function fetchDocuments(clientId: string): Promise<ClientDocument[]> {
  const snap = await getDocs(query(col.documents(clientId), orderBy("createdAt", "desc")));
  return snapToList<ClientDocument>(snap);
}

export async function addDocumentMeta(
  clientId: string,
  data: Omit<ClientDocument, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(col.documents(clientId), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDocumentMeta(clientId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "clients", clientId, "documents", id));
}

// ---------- Follow-ups ----------
export async function fetchFollowUps(role: Role, uid: string, clientId?: string): Promise<FollowUp[]> {
  const constraints: QueryConstraint[] = [...scopeToUser(role, uid)];
  if (clientId) constraints.push(where("clientId", "==", clientId));
  const snap = await getDocs(query(col.followups(), ...constraints));
  return snapToList<FollowUp>(snap).sort((a, b) =>
    (b.date + b.time).localeCompare(a.date + a.time)
  );
}

export async function addFollowUp(data: Omit<FollowUp, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(col.followups(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateFollowUp(id: string, data: Partial<FollowUp>): Promise<void> {
  await updateDoc(doc(db, "followups", id), data);
}

// ---------- Tasks ----------
export async function fetchTasks(role: Role, uid: string): Promise<TaskItem[]> {
  const constraints: QueryConstraint[] =
    role === "employee" ? [where("assignedTo", "==", uid)] : [];
  const snap = await getDocs(query(col.tasks(), ...constraints));
  return snapToList<TaskItem>(snap).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function addTask(data: Omit<TaskItem, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(col.tasks(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<TaskItem>): Promise<void> {
  await updateDoc(doc(db, "tasks", id), data);
}

// ---------- Sales ----------
export async function fetchSales(role: Role, uid: string, clientId?: string): Promise<Sale[]> {
  const constraints: QueryConstraint[] = [...scopeToUser(role, uid)];
  if (clientId) constraints.push(where("clientId", "==", clientId));
  const snap = await getDocs(query(col.sales(), ...constraints));
  return snapToList<Sale>(snap).sort((a, b) => (b.saleDate || "").localeCompare(a.saleDate || ""));
}

export async function addSale(data: Omit<Sale, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(col.sales(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateSale(id: string, data: Partial<Sale>): Promise<void> {
  await updateDoc(doc(db, "sales", id), data);
}

// ---------- Notifications ----------
export async function fetchNotifications(uid: string, max = 50): Promise<AppNotification[]> {
  // where-only (no composite index); sort + cap in memory
  const snap = await getDocs(query(col.notifications(), where("userId", "==", uid)));
  return snapToList<AppNotification>(snap)
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
    .slice(0, max);
}

export async function pushNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
): Promise<void> {
  await addDoc(col.notifications(), {
    userId,
    type,
    title,
    body: body ?? "",
    link: link ?? "",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

// ---------- Audit ----------
export async function logAudit(
  user: { uid: string; name: string; role: Role },
  action: string,
  entity: string,
  entityId?: string,
  previousValue?: string,
  updatedValue?: string
): Promise<void> {
  try {
    await addDoc(col.auditLogs(), {
      userId: user.uid,
      userName: user.name,
      role: user.role,
      action,
      entity,
      entityId: entityId ?? "",
      previousValue: previousValue ?? "",
      updatedValue: updatedValue ?? "",
      createdAt: serverTimestamp(),
    });
  } catch {
    // Audit logging must never break the main flow
  }
}

export async function fetchAuditLogs(role: Role, uid: string, max = 200): Promise<AuditLog[]> {
  if (role === "employee") {
    // where-only (no composite index); sort + cap in memory
    const snap = await getDocs(query(col.auditLogs(), where("userId", "==", uid)));
    return snapToList<AuditLog>(snap)
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
      .slice(0, max);
  }
  const snap = await getDocs(
    query(col.auditLogs(), orderBy("createdAt", "desc"), fbLimit(max))
  );
  return snapToList<AuditLog>(snap);
}

// ---------- Settings ----------
export async function fetchSettings(): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, "settings", "app"));
  return snap.exists() ? snap.data() : null;
}

export async function saveSettings(data: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, "settings", "app"), data, { merge: true });
}
