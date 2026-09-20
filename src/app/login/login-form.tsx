"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "কাজটি সম্পন্ন করা যায়নি");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("কাজটি সম্পন্ন করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">
        অ্যাডমিন লগইন <span className="text-slate-400">· Admin login</span>
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        অনুমোদিত কর্মীদের জন্য সংরক্ষিত।
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">ইমেইল</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-red-500/20"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">পাসওয়ার্ড</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-red-500/20"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "প্রবেশ করা হচ্ছে…" : "লগইন"}
      </button>
    </form>
  );
}
