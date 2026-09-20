"use client";

import { useState } from "react";

export function JsonViewer({
  data,
  label,
}: {
  data: unknown;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  if (data === null || data === undefined) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="max-w-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open ? (
        <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-slate-900 p-2.5 text-[11px] leading-relaxed text-slate-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
