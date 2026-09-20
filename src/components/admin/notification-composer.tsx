"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/action-button";
import { useToast } from "@/components/admin/toast";

const AUDIENCES = [
  { value: "ALL_USERS", bn: "সব সক্রিয় ব্যবহারকারী", en: "All active users" },
  { value: "DONORS", bn: "সব ডোনার", en: "All donors" },
  { value: "VERIFIED_DONORS", bn: "যাচাইকৃত ডোনার", en: "Verified donors" },
  { value: "AVAILABLE_DONORS", bn: "উপলব্ধ ডোনার", en: "Available donors" },
  { value: "SINGLE_USER", bn: "একজন ব্যবহারকারী", en: "A single user" },
];

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function NotificationComposer({
  lang,
  unions,
}: {
  lang: "bn" | "en";
  unions: string[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({
    audience: "VERIFIED_DONORS",
    userId: "",
    bloodGroup: "",
    union: "",
    titleBn: "",
    titleEn: "",
    bodyBn: "",
    bodyEn: "",
    link: "",
    type: "ANNOUNCEMENT",
  });
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function preview() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      setCount(data.count ?? 0);
      setOpen(true);
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

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { recipients?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      push(
        lang === "bn"
          ? `সফলভাবে সম্পন্ন হয়েছে — ${data.recipients} জনকে পাঠানো হয়েছে`
          : `Completed successfully — sent to ${data.recipients} recipients`,
      );
      setOpen(false);
      setForm((f) => ({ ...f, titleBn: "", titleEn: "", bodyBn: "", bodyEn: "" }));
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

  const input =
    "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20";

  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "অডিয়েন্স" : "Audience"}
        </span>
        <select
          className={input}
          value={form.audience}
          onChange={(e) => set("audience", e.target.value)}
        >
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {lang === "bn" ? a.bn : a.en}
            </option>
          ))}
        </select>
      </label>

      {form.audience === "SINGLE_USER" ? (
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {lang === "bn" ? "ব্যবহারকারী আইডি" : "User ID"}
          </span>
          <input
            className={input}
            value={form.userId}
            onChange={(e) => set("userId", e.target.value)}
          />
        </label>
      ) : (
        <>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {lang === "bn" ? "রক্তের গ্রুপ (ঐচ্ছিক)" : "Blood group (optional)"}
            </span>
            <select
              className={input}
              value={form.bloodGroup}
              onChange={(e) => set("bloodGroup", e.target.value)}
              disabled={form.audience === "ALL_USERS"}
            >
              <option value="">{lang === "bn" ? "সব" : "All"}</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {lang === "bn" ? "ইউনিয়ন (ঐচ্ছিক)" : "Union (optional)"}
            </span>
            <select
              className={input}
              value={form.union}
              onChange={(e) => set("union", e.target.value)}
              disabled={form.audience === "ALL_USERS"}
            >
              <option value="">{lang === "bn" ? "সব" : "All"}</option>
              {unions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "ধরন" : "Type"}
        </span>
        <select
          className={input}
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
        >
          {["ANNOUNCEMENT", "REQUEST_ALERT", "SYSTEM"].map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "বাংলা শিরোনাম" : "Bangla title"}
        </span>
        <input
          className={input}
          value={form.titleBn}
          onChange={(e) => set("titleBn", e.target.value)}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "ইংরেজি শিরোনাম" : "English title"}
        </span>
        <input
          className={input}
          value={form.titleEn}
          onChange={(e) => set("titleEn", e.target.value)}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "বাংলা বার্তা" : "Bangla body"}
        </span>
        <textarea
          rows={3}
          className={input}
          value={form.bodyBn}
          onChange={(e) => set("bodyBn", e.target.value)}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "ইংরেজি বার্তা" : "English body"}
        </span>
        <textarea
          rows={3}
          className={input}
          value={form.bodyEn}
          onChange={(e) => set("bodyEn", e.target.value)}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {lang === "bn" ? "লিংক (ঐচ্ছিক)" : "Link (optional)"}
        </span>
        <input
          className={input}
          value={form.link}
          onChange={(e) => set("link", e.target.value)}
          placeholder="/requests"
        />
      </label>

      <div className="sm:col-span-2">
        <button
          onClick={preview}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {lang === "bn" ? "প্রাপক দেখে পাঠান" : "Preview recipients & send"}
        </button>
      </div>

      {open ? (
        <ConfirmDialog
          lang={lang}
          busy={busy}
          title={lang === "bn" ? "ব্রডকাস্ট নিশ্চিত করুন" : "Confirm broadcast"}
          body={
            lang === "bn"
              ? `এই নোটিফিকেশনটি ${count} জন ব্যবহারকারীর কাছে পাঠানো হবে। এটি বাতিল করা যাবে না।`
              : `This notification will be sent to ${count} recipients. It cannot be undone.`
          }
          onCancel={() => setOpen(false)}
          onConfirm={send}
        />
      ) : null}
    </div>
  );
}
