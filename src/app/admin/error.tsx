"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
      <div aria-hidden className="text-3xl">
        ⚠️
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-900">
        ডেটা লোড করা সম্ভব হয়নি
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Could not load this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        আবার চেষ্টা করুন / Retry
      </button>
    </div>
  );
}
