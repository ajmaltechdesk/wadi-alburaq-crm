"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
    </div>
  );
}
