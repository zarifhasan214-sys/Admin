export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-56 rounded-lg bg-slate-200" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-xl border border-slate-200 bg-white lg:col-span-2" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white" />
      </div>
      <div className="h-80 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
