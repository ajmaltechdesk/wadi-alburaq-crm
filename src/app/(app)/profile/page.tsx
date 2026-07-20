"use client";

import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AED } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { Badge, Button, Field, Input } from "@/components/ui";

export default function ProfilePage() {
  const { profile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const save = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, "users", profile.uid), { phone }, { merge: true });
      if (newPw) {
        if (newPw.length < 6) {
          toast.error("Password must be at least 6 characters");
          setBusy(false);
          return;
        }
        if (auth.currentUser) await updatePassword(auth.currentUser, newPw);
        setNewPw("");
        toast.success("Password changed");
      }
      toast.success("Profile updated");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      toast.error(code === "auth/requires-recent-login"
        ? "Please sign out and back in before changing your password."
        : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">My Profile</h1>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-[#14477d] to-[#17847b] text-xl font-bold text-white">
            {initials(profile.name)}
          </span>
          <div>
            <p className="text-lg font-bold">{profile.name}</p>
            <p className="text-sm text-fg-muted">{profile.email}</p>
            <div className="mt-1 flex gap-1.5">
              <Badge tone="info"><span className="capitalize">{profile.role}</span></Badge>
              {profile.department && <Badge tone="muted">{profile.department}</Badge>}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
          <div><dt className="text-xs font-semibold uppercase text-fg-faint">Employee ID</dt><dd className="font-medium">{profile.employeeId || "—"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-fg-faint">Designation</dt><dd className="font-medium">{profile.designation || "—"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-fg-faint">Monthly Target</dt><dd className="font-medium">{profile.monthlyTarget ? AED.format(profile.monthlyTarget) : "—"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-fg-faint">Status</dt><dd className="font-medium capitalize">{profile.status}</dd></div>
        </dl>
      </div>

      <div className="card space-y-4 p-5">
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="New Password" hint="Leave blank to keep your current password">
          <Input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={save} loading={busy}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
