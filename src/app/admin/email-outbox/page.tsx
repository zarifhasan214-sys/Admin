import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
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

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

export default async function EmailOutboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:outbox");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const status = get("status");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(emailOutbox.recipient, like),
      ilike(emailOutbox.subject, like),
      ilike(emailOutbox.template, like),
    );
    if (term) filters.push(term);
  }
  if (status) filters.push(eq(emailOutbox.status, status as "DELIVERED"));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(emailOutbox)
      .where(where)
      .orderBy(desc(emailOutbox.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(emailOutbox).where(where),
  ]);

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "ইমেইল আউটবক্স" : "Email outbox"}
        subtitle={
          lang === "bn"
            ? "সিস্টেম ইমেইলের ডেলিভারি অবস্থা (কোনো গোপন তথ্য প্রদর্শিত হয় না)"
            : "Delivery status of system emails (no secrets are displayed)"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "ইমেইল আউটবক্স" : "Email outbox" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "প্রাপক, বিষয় বা টেমপ্লেট…" : "Recipient, subject or template…"}
        fields={[
          {
            type: "select",
            name: "status",
            label: lang === "bn" ? "অবস্থা" : "Status",
            options: ["PENDING", "DELIVERED", "FAILED"].map((s) => ({
              value: s,
              label: s,
            })),
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="✉"
            title={lang === "bn" ? "কোনো ইমেইল রেকর্ড নেই" : "No email records"}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "প্রাপক" : "Recipient"}</Th>
                  <Th>{lang === "bn" ? "বিষয়" : "Subject"}</Th>
                  <Th>{lang === "bn" ? "টেমপ্লেট" : "Template"}</Th>
                  <Th>{lang === "bn" ? "অবস্থা" : "Status"}</Th>
                  <Th>{lang === "bn" ? "ত্রুটি" : "Error"}</Th>
                  <Th>{lang === "bn" ? "তৈরি" : "Created"}</Th>
                  <Th>{lang === "bn" ? "পাঠানো" : "Sent"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <Td className="text-slate-800">{e.recipient}</Td>
                    <Td className="text-slate-700">{e.subject}</Td>
                    <Td className="text-slate-600">{e.template}</Td>
                    <Td>
                      <StatusBadge status={e.status} />
                    </Td>
                    <Td className="max-w-xs truncate text-slate-500">
                      {e.deliveryError ?? "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(e.createdAt, lang, true)}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(e.createdAt, lang, true)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={totalRow?.value ?? 0}
              baseQuery={{ q, status }}
              lang={lang}
            />
          </>
        )}
      </Card>
    </div>
  );
}
