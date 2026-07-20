"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { COMPANY_NAME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const message =
        code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
          ? "Invalid email or password. Please check and try again."
          : code === "auth/too-many-requests"
            ? "Too many attempts. Please wait a moment and retry."
            : "Sign-in failed. Please check your connection and try again.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh">
      {/* Brand panel */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-linear-to-br from-[#0e2d4f] via-[#14477d] to-[#17847b] lg:flex">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden />
        <div className="relative z-10 flex max-w-md flex-col items-center px-10 text-center text-white">
          <Logo variant="full" size={240} withText={false} className="mb-6 justify-center" />
          <h1 className="text-3xl font-extrabold leading-tight">
            Client & Sales Management Dashboard
          </h1>
          <p className="mt-4 text-white/80">
            Manage enquiries, track requirements, schedule follow-ups and monitor sales — all in
            one secure workspace built for {COMPANY_NAME}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-bg px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Logo shown only on mobile, where the left brand panel is hidden */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo variant="full" size={160} withText={false} />
          </div>
          <h2 className="text-center text-2xl font-extrabold">Sign in</h2>
          <p className="mt-1 text-center text-sm text-fg-muted">Use your company email and password</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@wadialburaq.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label="Password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
                <Input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1.5 text-fg-faint hover:text-fg"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-fg-faint">
            Access is provisioned by your administrator.
            <br />© {new Date().getFullYear()} {COMPANY_NAME}
          </p>
        </div>
      </div>
    </main>
  );
}
