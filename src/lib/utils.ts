import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtDate(value?: Timestamp | string | Date | null, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  try {
    const d =
      typeof value === "string"
        ? new Date(value)
        : value instanceof Date
          ? value
          : value.toDate();
    if (isNaN(d.getTime())) return "—";
    return format(d, pattern);
  } catch {
    return "—";
  }
}

export function fmtDateTime(value?: Timestamp | string | Date | null): string {
  return fmtDate(value, "dd MMM yyyy, hh:mm a");
}

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthKey(d = new Date()): string {
  return format(d, "yyyy-MM");
}

/** Generate next client code like WB-2026-0142 */
export function nextClientCode(seq: number): string {
  return `WB-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
