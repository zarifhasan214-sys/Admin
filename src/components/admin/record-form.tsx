"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/admin/toast";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "checkbox" | "select" | "textarea" | "url";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
};

export function RecordForm({
  endpoint,
  method = "POST",
  fields,
  initial = {},
  submitLabel,
  lang,
  compact = false,
  onDone,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  fields: FormField[];
  initial?: Record<string, string | number | boolean | null>;
  submitLabel: string;
  lang: "bn" | "en";
  compact?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    for (const f of fields) {
      const v = initial[f.name];
      init[f.name] =
        f.type === "checkbox" ? Boolean(v) : v === null || v === undefined ? "" : String(v);
    }
    return init;
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      push(lang === "bn" ? "সফলভাবে সম্পন্ন হয়েছে" : "Completed successfully");
      router.refresh();
      onDone?.();
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
    <form
      onSubmit={submit}
      className={`grid gap-3 px-5 py-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {fields.map((f) => (
        <label
          key={f.name}
          className={f.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}
        >
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {f.label}
            {f.required ? <span className="text-red-600"> *</span> : null}
          </span>
          {f.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={Boolean(values[f.name])}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
          ) : f.type === "select" ? (
            <select
              required={f.required}
              value={String(values[f.name] ?? "")}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">—</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              required={f.required}
              rows={3}
              value={String(values[f.name] ?? "")}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
            />
          ) : (
            <input
              type={f.type === "url" ? "url" : (f.type ?? "text")}
              required={f.required}
              value={String(values[f.name] ?? "")}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
            />
          )}
          {f.help ? (
            <span className="mt-1 block text-[11px] text-slate-400">{f.help}</span>
          ) : null}
        </label>
      ))}
      <div className="flex items-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? (lang === "bn" ? "সংরক্ষণ হচ্ছে…" : "Saving…") : submitLabel}
        </button>
      </div>
    </form>
  );
}
