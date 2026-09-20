import { and, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import { JsonViewer } from "@/components/admin/json-viewer";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  RoleBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:audit");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const resource = get("resource");
  const from = get("from");
  const to = get("to");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(auditLogs.actorName, like),
      ilike(auditLogs.action, like),
      ilike(auditLogs.resourceId, like),
    );
    if (term) filters.push(term);
  }
  if (resource) filters.push(eq(auditLogs.resourceType, resource));
  if (from) filters.push(gte(auditLogs.createdAt, new Date(from)));
  if (to) filters.push(lte(auditLogs.createdAt, new Date(`${to}T23:59:59`)));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow], resourceTypes] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(auditLogs).where(where),
    db.selectDistinct({ type: auditLogs.resourceType }).from(auditLogs),
  ]);

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "সিস্টেম লগ" : "Audit logs"}
        subtitle={
          lang === "bn"
            ? "সব সংবেদনশীল প্রশাসনিক কার্যক্রমের অপরিবর্তনীয় রেকর্ড"
            : "Immutable record of every sensitive administrative action"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "সিস্টেম লগ" : "Audit logs" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "অ্যাডমিন, অ্যাকশন বা রিসোর্স আইডি…" : "Admin, action or resource id…"}
        fields={[
          {
            type: "select",
            name: "resource",
            label: lang === "bn" ? "রিসোর্স" : "Resource",
            options: resourceTypes.map((r) => ({ value: r.type, label: r.type })),
          },
          { type: "date", name: "from", label: lang === "bn" ? "শুরু" : "From" },
          { type: "date", name: "to", label: lang === "bn" ? "শেষ" : "To" },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="⎘"
            title={lang === "bn" ? "কোনো লগ পাওয়া যায়নি" : "No audit entries found"}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "সময়" : "Timestamp"}</Th>
                  <Th>{lang === "bn" ? "অ্যাডমিন" : "Actor"}</Th>
                  <Th>{lang === "bn" ? "অ্যাকশন" : "Action"}</Th>
                  <Th>{lang === "bn" ? "রিসোর্স" : "Resource"}</Th>
                  <Th>IP</Th>
                  <Th>{lang === "bn" ? "পূর্বাবস্থা" : "Previous"}</Th>
                  <Th>{lang === "bn" ? "নতুন অবস্থা" : "New"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70">
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(log.createdAt, lang, true)}
                    </Td>
                    <Td>
                      <div className="text-slate-900">{log.actorName ?? "—"}</div>
                      {log.actorRole ? <RoleBadge role={log.actorRole} /> : null}
                    </Td>
                    <Td>
                      <Badge tone="neutral">{log.action.replaceAll("_", " ")}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {log.resourceType}
                      {log.resourceId ? ` #${log.resourceId}` : ""}
                    </Td>
                    <Td className="text-slate-500">{log.ipAddress ?? "—"}</Td>
                    <Td>
                      <JsonViewer data={log.previousState} label="JSON" />
                    </Td>
                    <Td>
                      <JsonViewer data={log.newState} label="JSON" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={totalRow?.value ?? 0}
              baseQuery={{ q, resource, from, to }}
              lang={lang}
            />
          </>
        )}
      </Card>
    </div>
  );
}
