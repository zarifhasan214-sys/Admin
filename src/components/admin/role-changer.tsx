"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/action-button";
import { useToast } from "@/components/admin/toast";

const ROLES = ["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function RoleChanger({
  userId,
  currentRole,
  lang,
}: {
  userId: number;
  currentRole: string;
  lang: "bn" | "en";
}) {
  const router = useRouter();
  const { push } = useToast();
  const [role, setRole] = useState(currentRole);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      push(lang === "bn" ? "সফলভাবে সম্পন্ন হয়েছে" : "Completed successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      push(
        error instanceof Error && error.message !== "failed"
          ? error.message
          : lang === "bn"
            ? "কাজটি সম্পন্ন করা যায়নি"
            : "The action could not be completed",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500/20"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <button
        disabled={role === currentRole}
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {lang === "bn" ? "রোল পরিবর্তন" : "Change role"}
      </button>
      {open ? (
        <ConfirmDialog
          lang={lang}
          busy={busy}
          title={lang === "bn" ? "রোল পরিবর্তন নিশ্চিত করুন" : "Confirm role change"}
          body={
            lang === "bn"
              ? `রোল ${currentRole} থেকে ${role} করা হবে। এটি অডিট লগে সংরক্ষিত হবে।`
              : `Role will change from ${currentRole} to ${role}. This is recorded in the audit log.`
          }
          onCancel={() => setOpen(false)}
          onConfirm={save}
        />
      ) : null}
    </div>
  );
}
