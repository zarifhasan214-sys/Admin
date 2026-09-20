import type { AuditLog } from "@/db/schema";
import { fmtDate, type Lang } from "@/lib/i18n";
import { Badge, EmptyState, RoleBadge } from "@/components/admin/ui";

const ACTION_TONE = (action: string) => {
  if (/REJECT|SUSPEND|FAIL|DELETE/i.test(action)) return "critical" as const;
  if (/VERIF|RESOLVE|COMPLETE|ACTIVATE|RESTORE/i.test(action))
    return "success" as const;
  if (/PENDING|REVIEW|UPDATE|CHANGE/i.test(action)) return "warning" as const;
  return "neutral" as const;
};

export function ActivityTimeline({
  logs,
  lang,
}: {
  logs: AuditLog[];
  lang: Lang;
}) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon="🗂"
        title={lang === "bn" ? "কোনো কার্যক্রম নেই" : "No activity yet"}
      />
    );
  }
  return (
    <ol className="divide-y divide-slate-100">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-3 px-5 py-3">
          <span
            aria-hidden
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={ACTION_TONE(log.action)}>
                {log.action.replaceAll("_", " ")}
              </Badge>
              <span className="text-xs text-slate-500">
                {log.resourceType}
                {log.resourceId ? ` #${log.resourceId}` : ""}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-700">
              {log.actorName ?? (lang === "bn" ? "সিস্টেম" : "System")}{" "}
              {log.actorRole ? <RoleBadge role={log.actorRole} /> : null}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {fmtDate(log.createdAt, lang, true)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
