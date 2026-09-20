import Link from "next/link";
import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:reports");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const status = get("status");
  const priority = get("priority");
  const bucket = get("bucket");
  const page = Math.max(1, Number(get("page")) || 1);

  const reporter = alias(users, "reporter");
  const resolver = alias(users, "resolver");

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(reports.reason, like),
      ilike(reports.description, like),
      ilike(reporter.name, like),
    );
    if (term) filters.push(term);
  }
  if (status) filters.push(eq(reports.status, status as "PENDING"));
  if (priority) filters.push(eq(reports.priority, priority as "HIGH"));
  if (bucket === "open")
    filters.push(inArray(reports.status, ["PENDING", "UNDER_REVIEW"]));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        report: reports,
        reporterName: reporter.name,
        reporterId: reporter.id,
        resolverName: resolver.name,
      })
      .from(reports)
      .leftJoin(reporter, eq(reporter.id, reports.reporterId))
      .leftJoin(resolver, eq(resolver.id, reports.resolvedBy))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ value: count() })
      .from(reports)
      .leftJoin(reporter, eq(reporter.id, reports.reporterId))
      .where(where),
  ]);

  const canModerate = can(actor.role, "moderate:reports");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "রিপোর্ট ও মডারেশন" : "Reports & moderation"}
        subtitle={
          lang === "bn"
            ? "ব্যবহারকারীর অভিযোগ পর্যালোচনা ও নিষ্পত্তি"
            : "Review and resolve community reports"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "রিপোর্ট" : "Reports" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "কারণ, বিবরণ বা রিপোর্টার…" : "Reason, description or reporter…"}
        exportHref="/api/admin/export/reports"
        fields={[
          {
            type: "select",
            name: "status",
            label: lang === "bn" ? "অবস্থা" : "Status",
            options: ["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED", "DISMISSED"].map(
              (s) => ({ value: s, label: s.replaceAll("_", " ") }),
            ),
          },
          {
            type: "select",
            name: "priority",
            label: lang === "bn" ? "অগ্রাধিকার" : "Priority",
            options: ["LOW", "NORMAL", "HIGH", "CRITICAL"].map((s) => ({
              value: s,
              label: s,
            })),
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="⚑"
            title={lang === "bn" ? "কোনো রিপোর্ট পাওয়া যায়নি" : "No reports found"}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "রিপোর্টার" : "Reporter"}</Th>
                  <Th>{lang === "bn" ? "টার্গেট" : "Target"}</Th>
                  <Th>{lang === "bn" ? "কারণ" : "Reason"}</Th>
                  <Th>{lang === "bn" ? "অগ্রাধিকার" : "Priority"}</Th>
                  <Th>{lang === "bn" ? "অবস্থা" : "Status"}</Th>
                  <Th>{lang === "bn" ? "তৈরি" : "Created"}</Th>
                  <Th>{lang === "bn" ? "নিষ্পত্তি" : "Resolved by"}</Th>
                  <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ report: r, reporterName, reporterId, resolverName }) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <Td>
                      {reporterId ? (
                        <Link
                          href={`/admin/users/${reporterId}`}
                          className="text-slate-900 hover:underline"
                        >
                          {reporterName}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </Td>
                    <Td>
                      <Link
                        href={
                          r.targetType === "USER"
                            ? `/admin/users/${r.targetId}`
                            : `/admin/requests/${r.targetId}`
                        }
                        className="text-slate-800 hover:underline"
                      >
                        {r.targetType.replaceAll("_", " ")} #{r.targetId}
                      </Link>
                    </Td>
                    <Td className="max-w-xs">
                      <div className="text-slate-800">{r.reason}</div>
                      <div className="truncate text-[11px] text-slate-400">
                        {r.description ?? ""}
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={r.priority} />
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(r.createdAt, lang)}
                    </Td>
                    <Td className="text-slate-600">
                      {resolverName ?? "—"}
                      {r.resolutionNote ? (
                        <div className="max-w-40 truncate text-[11px] text-slate-400">
                          {r.resolutionNote}
                        </div>
                      ) : null}
                    </Td>
                    <Td>
                      {canModerate &&
                      ["PENDING", "UNDER_REVIEW"].includes(r.status) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.status === "PENDING" ? (
                            <ActionButton
                              lang={lang}
                              endpoint={`/api/admin/reports/${r.id}/status`}
                              payload={{ status: "UNDER_REVIEW" }}
                              label={lang === "bn" ? "রিভিউ শুরু" : "Review"}
                              confirmTitle={
                                lang === "bn"
                                  ? "রিভিউ শুরু করবেন?"
                                  : "Mark as under review?"
                              }
                            />
                          ) : null}
                          <ActionButton
                            lang={lang}
                            tone="success"
                            requireNote
                            endpoint={`/api/admin/reports/${r.id}/status`}
                            payload={{ status: "RESOLVED" }}
                            label={lang === "bn" ? "নিষ্পত্তি" : "Resolve"}
                            confirmTitle={
                              lang === "bn" ? "রিপোর্ট নিষ্পত্তি করবেন?" : "Resolve report?"
                            }
                            noteLabel={
                              lang === "bn" ? "নিষ্পত্তির নোট" : "Resolution note"
                            }
                          />
                          <ActionButton
                            lang={lang}
                            tone="danger"
                            requireNote
                            endpoint={`/api/admin/reports/${r.id}/status`}
                            payload={{ status: "REJECTED" }}
                            label={lang === "bn" ? "প্রত্যাখ্যান" : "Reject"}
                            confirmTitle={
                              lang === "bn" ? "রিপোর্ট প্রত্যাখ্যান?" : "Reject report?"
                            }
                          />
                          <ActionButton
                            lang={lang}
                            requireNote
                            endpoint={`/api/admin/reports/${r.id}/status`}
                            payload={{ status: "DISMISSED" }}
                            label={lang === "bn" ? "বাতিল" : "Dismiss"}
                            confirmTitle={
                              lang === "bn" ? "রিপোর্ট বাতিল করবেন?" : "Dismiss report?"
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={totalRow?.value ?? 0}
              baseQuery={{ q, status, priority, bucket }}
              lang={lang}
            />
          </>
        )}
      </Card>
    </div>
  );
}
