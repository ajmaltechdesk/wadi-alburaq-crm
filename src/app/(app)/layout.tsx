"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("wadi-sidebar");
    if (stored) setCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh">
        <div className="hidden w-64 border-r border-border bg-surface p-4 lg:block">
          <Skeleton className="h-10 w-full" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Signed in but no profile document — account not provisioned
  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Account not provisioned</h1>
        <p className="max-w-md text-sm text-fg-muted">
          Your login exists but no employee profile has been set up. Please ask your administrator
          to create your profile in the system.
        </p>
        <button onClick={logout} className="cursor-pointer text-sm font-semibold text-primary hover:underline">
          Sign out
        </button>
      </div>
    );
  }

  if (profile.status === "inactive") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Account deactivated</h1>
        <p className="max-w-md text-sm text-fg-muted">
          Your account has been deactivated. Contact your administrator for assistance.
        </p>
        <button onClick={logout} className="cursor-pointer text-sm font-semibold text-primary hover:underline">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => {
          setCollapsed((v) => {
            localStorage.setItem("wadi-sidebar", v ? "0" : "1");
            return !v;
          });
        }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
