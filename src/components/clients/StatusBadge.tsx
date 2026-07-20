"use client";

import { Badge } from "@/components/ui";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import type { ClientStatus, Priority } from "@/lib/types";

export function StatusBadge({ status }: { status: ClientStatus }) {
  const tone = (STATUS_COLORS[status] ?? "muted") as "primary" | "success" | "warning" | "danger" | "info" | "muted";
  return <Badge tone={tone === "primary" ? "info" : tone}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = (PRIORITY_COLORS[priority] ?? "muted") as "warning" | "danger" | "muted";
  return <Badge tone={tone}>{priority}</Badge>;
}
