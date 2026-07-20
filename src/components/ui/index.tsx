"use client";

import { cn } from "@/lib/utils";
import { X, Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary:
      "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/40 dark:text-[#0b1421]",
    accent:
      "bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent/40 dark:text-[#0b1421]",
    secondary:
      "bg-surface border border-border text-fg hover:bg-surface-2 focus-visible:ring-primary/30",
    ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-primary/30",
    danger: "bg-danger text-white hover:opacity-90 focus-visible:ring-danger/40",
  };
  return (
    <button
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        styles[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "muted";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    muted: "bg-surface-2 text-fg-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Form fields ---------------- */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-fg-faint">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const inputBase =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-faint transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputBase, "cursor-pointer", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputBase, "h-auto min-h-24 py-2 leading-relaxed", props.className)}
    />
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to <body> so the overlay escapes any ancestor with a CSS transform
  // (e.g. the page's `animate-fade-up` wrapper), which would otherwise become
  // the containing block for `position: fixed` and clip the modal.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={ref}
        className={cn(
          "card animate-fade-up my-auto flex max-h-[90dvh] w-full flex-col rounded-xl shadow-(--shadow-pop)",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-5 sm:px-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 cursor-pointer rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="rounded-full bg-surface-2 p-4">
        <Inbox className="size-7 text-fg-faint" aria-hidden />
      </div>
      <p className="font-semibold text-fg">{title}</p>
      {hint && <p className="max-w-sm text-sm text-fg-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------------- Search box ---------------- */
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        type="search"
        aria-label={placeholder}
      />
    </div>
  );
}

/* ---------------- Pagination ---------------- */
export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
      <span className="text-sm text-fg-muted">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="secondary"
        className="h-8 px-2"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="secondary"
        className="h-8 px-2"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

/* ---------------- Stat card ---------------- */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  sub,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "primary" | "accent" | "success" | "warning" | "danger" | "info";
  sub?: string;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="card flex items-start justify-between p-4 transition-shadow hover:shadow-(--shadow-pop)">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-fg-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-fg-faint">{sub}</p>}
      </div>
      {icon && <div className={cn("rounded-lg p-2.5", tones[tone])}>{icon}</div>}
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            active === t.key
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs tabular-nums">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
