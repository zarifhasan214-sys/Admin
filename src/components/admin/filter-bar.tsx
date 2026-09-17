"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type FilterField =
  | {
      type: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | { type: "date"; name: string; label: string }
  | { type: "text"; name: string; label: string };

export function FilterBar({
  searchPlaceholder,
  fields,
  lang,
  exportHref,
}: {
  searchPlaceholder: string;
  fields: FilterField[];
  lang: "bn" | "en";
  exportHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function update(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  const hasFilters = Array.from(params.keys()).some((k) => k !== "page");

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-[11px] font-medium text-slate-500">
          {lang === "bn" ? "খুঁজুন" : "Search"}
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      {fields.map((f) => (
        <div key={f.name} className="min-w-[140px]">
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            {f.label}
          </label>
          {f.type === "select" ? (
            <select
              value={params.get(f.name) ?? ""}
              onChange={(e) => update(f.name, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">{lang === "bn" ? "সব" : "All"}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              value={params.get(f.name) ?? ""}
              onChange={(e) => update(f.name, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
            />
          )}
        </div>
      ))}

      <div className="flex gap-2">
        {hasFilters ? (
          <button
            onClick={() => {
              setQ("");
              router.push(pathname);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {lang === "bn" ? "ফিল্টার মুছুন" : "Clear filters"}
          </button>
        ) : null}
        {exportHref ? (
          <a
            href={exportHref}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {lang === "bn" ? "এক্সপোর্ট (CSV)" : "Export (CSV)"}
          </a>
        ) : null}
      </div>
    </div>
  );
}
