"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/components/admin/toast";

export type ActionTone = "primary" | "danger" | "neutral" | "success";

const TONE: Record<ActionTone, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  neutral:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

export function ActionButton({
  endpoint,
  method = "POST",
  payload = {},
  label,
  tone = "neutral",
  confirmTitle,
  confirmBody,
  requireNote = false,
  noteLabel,
  lang,
  disabled,
  size = "sm",
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  payload?: Record<string, unknown>;
  label: string;
  tone?: ActionTone;
  confirmTitle: string;
  confirmBody?: string;
  requireNote?: boolean;
  noteLabel?: string;
  lang: "bn" | "en";
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (requireNote && note.trim().length < 3) {
      push(
        lang === "bn" ? "একটি কারণ লিখুন" : "Please provide a reason",
        "error",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      push(lang === "bn" ? "সফলভাবে সম্পন্ন হয়েছে" : "Completed successfully");
      setOpen(false);
      setNote("");
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
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
        } ${TONE[tone]}`}
      >
        {label}
      </button>
      {open ? (
        <ConfirmDialog
          title={confirmTitle}
          body={confirmBody}
          busy={busy}
          lang={lang}
          onCancel={() => setOpen(false)}
          onConfirm={run}
        >
          {requireNote ? (
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {noteLabel ?? (lang === "bn" ? "কারণ / নোট" : "Reason / note")}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </label>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

export function ConfirmDialog({
  title,
  body,
  children,
  busy,
  lang,
  onCancel,
  onConfirm,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  busy?: boolean;
  lang: "bn" | "en";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {body ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
        ) : null}
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy
              ? lang === "bn"
                ? "প্রক্রিয়া চলছে…"
                : "Working…"
              : lang === "bn"
                ? "নিশ্চিত করুন"
                : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
