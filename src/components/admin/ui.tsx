import Link from "next/link";
import type { ReactNode } from "react";
import { fmtNumber, type Lang } from "@/lib/i18n";

/* ---------------------------------- card ---------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs?.length ? (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-slate-900">
                  {b.label}
                </Link>
              ) : (
                <span className="text-slate-700">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/* -------------------------------- stat card -------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  tone = "neutral",
  lang,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  icon: string;
  tone?: "neutral" | "success" | "warning" | "critical" | "info";
  lang: Lang;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    critical: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
  };
  const body = (
    <div className="flex h-full flex-col justify-between gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {fmtNumber(value, lang)}
        </div>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
  if (!href) return <Card className="h-full">{body}</Card>;
  return (
    <Link
      href={href}
      className="block h-full rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      {body}
    </Link>
  );
}

/* --------------------------------- badges --------------------------------- */

type Tone = "success" | "warning" | "critical" | "error" | "neutral" | "info";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  critical: "bg-red-50 text-red-700 ring-red-600/20",
  error: "bg-rose-50 text-rose-700 ring-rose-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  VERIFIED: "success",
  COMPLETED: "success",
  DELIVERED: "success",
  ACCEPTED: "success",
  RESOLVED: "success",
  AVAILABLE: "success",
  PENDING: "warning",
  PENDING_REVIEW: "warning",
  UNDER_REVIEW: "warning",
  SEARCHING_FOR_DONOR: "info",
  DONOR_CONTACTED: "info",
  NOTIFIED: "info",
  UNVERIFIED: "neutral",
  TEMPORARILY_UNAVAILABLE: "warning",
  NOT_AVAILABLE: "neutral",
  DEACTIVATED: "neutral",
  WITHDRAWN: "neutral",
  DISMISSED: "neutral",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  DECLINED: "error",
  REJECTED: "error",
  FAILED: "error",
  SUSPENDED: "critical",
  DELETION_REQUESTED: "critical",
  CRITICAL: "critical",
  HIGH: "critical",
  URGENT: "warning",
  NORMAL: "neutral",
  ROUTINE: "neutral",
  LOW: "neutral",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

const ROLE_TONE: Record<string, Tone> = {
  USER: "neutral",
  SUPPORT: "info",
  MODERATOR: "warning",
  ADMIN: "success",
  SUPER_ADMIN: "critical",
};

export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONE[role] ?? "neutral"}>{role.replaceAll("_", " ")}</Badge>;
}

export function BloodGroupTag({ group }: { group: string }) {
  return (
    <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
      {group}
    </span>
  );
}

/* ------------------------------- empty state ------------------------------- */

export function EmptyState({
  title,
  description,
  icon = "📭",
  action,
}: {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div aria-hidden className="text-3xl opacity-70">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-slate-500">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

/* ---------------------------------- table ---------------------------------- */

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide text-slate-600 uppercase backdrop-blur ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b border-slate-100 px-4 py-3 align-middle ${className}`}>
      {children}
    </td>
  );
}

/* -------------------------------- pagination ------------------------------- */

export function Pagination({
  page,
  pageSize,
  total,
  baseQuery,
  lang,
}: {
  page: number;
  pageSize: number;
  total: number;
  baseQuery: Record<string, string | undefined>;
  lang: Lang;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const mk = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(baseQuery).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    params.set("page", String(p));
    return `?${params.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
      <span>
        {lang === "bn"
          ? `${fmtNumber(from, lang)}–${fmtNumber(to, lang)} / মোট ${fmtNumber(total, lang)}`
          : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <PageLink href={mk(Math.max(1, page - 1))} disabled={page <= 1}>
          {lang === "bn" ? "পূর্ববর্তী" : "Previous"}
        </PageLink>
        <span className="tabular-nums">
          {fmtNumber(page, lang)} / {fmtNumber(pages, lang)}
        </span>
        <PageLink href={mk(Math.min(pages, page + 1))} disabled={page >= pages}>
          {lang === "bn" ? "পরবর্তী" : "Next"}
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-slate-200 px-2.5 py-1 text-slate-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

/* ------------------------------- detail parts ------------------------------ */

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-5 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-900">{children ?? "—"}</dd>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
      {children}
    </p>
  );
}
