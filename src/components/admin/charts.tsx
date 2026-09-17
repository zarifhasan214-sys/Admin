import { fmtNumber, type Lang } from "@/lib/i18n";

export type Slice = { label: string; value: number; color?: string };

const PALETTE = [
  "#dc2626",
  "#0284c7",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0f766e",
  "#475569",
];

export function BarList({
  items,
  lang,
  emptyLabel,
}: {
  items: Slice[];
  lang: Lang;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-xs text-slate-500">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5 px-5 py-4">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {fmtNumber(item.value, lang)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({
  items,
  lang,
  emptyLabel,
}: {
  items: Slice[];
  lang: Lang;
  emptyLabel: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    return <p className="px-5 py-8 text-center text-xs text-slate-500">{emptyLabel}</p>;
  }
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offsets: number[] = [];
  items.reduce((acc, item) => {
    offsets.push(acc);
    return acc + (item.value / total) * circumference;
  }, 0);
  return (
    <div className="flex flex-wrap items-center gap-5 px-5 py-4">
      <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0 -rotate-90">
        {items.map((item, i) => {
          const fraction = item.value / total;
          const dash = fraction * circumference;
          return (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="20"
              stroke={item.color ?? PALETTE[i % PALETTE.length]}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-(offsets[i] ?? 0)}
            />
          );
        })}
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color ?? PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {fmtNumber(item.value, lang)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimeSeries({
  points,
  lang,
  emptyLabel,
  color = "#dc2626",
}: {
  points: { label: string; value: number }[];
  lang: Lang;
  emptyLabel: string;
  color?: string;
}) {
  if (points.length === 0) {
    return <p className="px-5 py-8 text-center text-xs text-slate-500">{emptyLabel}</p>;
  }
  const w = 640;
  const h = 180;
  const pad = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - (p.value / max) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${coords.join(" L")}`;
  const area = `${line} L${(pad + (points.length - 1) * step).toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  const total = points.reduce((s, p) => s + p.value, 0);

  return (
    <div className="px-5 py-4">
      <p className="mb-2 text-xs text-slate-500">
        {lang === "bn" ? "মোট" : "Total"}:{" "}
        <span className="font-semibold text-slate-900">{fmtNumber(total, lang)}</span>
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
      >
        <path d={area} fill={color} opacity="0.08" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{points[0]!.label}</span>
        <span>{points[points.length - 1]!.label}</span>
      </div>
    </div>
  );
}
