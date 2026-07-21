"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  PhoneCall,
  CheckSquare,
  CalendarDays,
  Banknote,
  FileBarChart,
  UserCog,
  Bell,
  ScrollText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    section: "Work",
    items: [
      { href: "/clients", label: "Clients", icon: Users, roles: ["admin", "manager", "employee"] },
      { href: "/kanban", label: "Lead Board", icon: Kanban, roles: ["admin", "manager", "employee"] },
      { href: "/followups", label: "Follow-ups", icon: PhoneCall, roles: ["admin", "manager", "employee"] },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["admin", "manager", "employee"] },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "manager", "employee"] },
      { href: "/sales", label: "Sales", icon: Banknote, roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin", "manager", "employee"] },
      { href: "/employees", label: "Team", icon: UserCog, roles: ["admin", "manager"] },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "manager", "employee"] },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["admin", "manager", "employee"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role ?? "employee";

  const nav = (
    <nav className="flex h-full flex-col" aria-label="Main navigation">
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-2")}>
        <Logo withText={!collapsed} size={collapsed ? 26 : 34} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={group.section} className="mb-5">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-fg-faint">
                  {group.section}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-primary-soft font-semibold text-primary"
                            : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon className="size-[18px] shrink-0" aria-hidden />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <button
        onClick={onToggle}
        className="m-3 hidden cursor-pointer items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 lg:flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && "Collapse"}
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} aria-hidden />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 bg-surface shadow-(--shadow-pop)">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
