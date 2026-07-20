"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
  const router = useRouter();
  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/clients" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-primary">
          <ArrowLeft className="size-4" /> Back to clients
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Add New Client</h1>
        <p className="text-sm text-fg-muted">A client code will be generated automatically.</p>
      </div>
      <div className="card p-6">
        <ClientForm
          onSaved={(id) => router.push(`/clients/${id}`)}
          onCancel={() => router.push("/clients")}
        />
      </div>
    </div>
  );
}
