import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles, donorResponses, users } from "@/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  BloodGroupTag,
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

export default async function DonorResponsesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:responses");
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
      ilike(users.name, like),
      ilike(bloodRequests.patientName, like),
      ilike(bloodRequests.hospitalName, like),
    );
    if (term) filters.push(term);
  }
  if (status) filters.push(eq(donorResponses.status, status as "ACCEPTED"));
  const where = filters.length ? and(...filters) : undefined;

  const base = db
    .select({
      response: donorResponses,
      donorName: users.name,
      donorProfileId: donorProfiles.id,
      bloodGroup: donorProfiles.bloodGroup,
      patientName: bloodRequests.patientName,
      requestId: bloodRequests.id,
      requestStatus: bloodRequests.status,
    })
    .from(donorResponses)
    .innerJoin(donorProfiles, eq(donorProfiles.id, donorResponses.donorId))
    .innerJoin(users, eq(users.id, donorProfiles.userId))
    .innerJoin(bloodRequests, eq(bloodRequests.id, donorResponses.requestId));

  const [rows, [totalRow]] = await Promise.all([
    base
      .where(where)
      .orderBy(desc(donorResponses.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ value: count() })
      .from(donorResponses)
      .innerJoin(donorProfiles, eq(donorProfiles.id, donorResponses.donorId))
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .innerJoin(bloodRequests, eq(bloodRequests.id, donorResponses.requestId))
      .where(where),
  ]);

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "ডোনার সাড়া" : "Donor responses"}
        subtitle={
          lang === "bn"
            ? "অনুরোধের বিপরীতে ডোনারদের সাড়ার ইতিহাস"
            : "History of donor responses against blood requests"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "ডোনার সাড়া" : "Donor responses" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={
          lang === "bn" ? "ডোনার, রোগী বা হাসপাতাল…" : "Donor, patient or hospital…"
        }
        fields={[
          {
            type: "select",
            name: "status",
            label: lang === "bn" ? "সাড়ার অবস্থা" : "Response status",
            options: ["NOTIFIED", "ACCEPTED", "DECLINED", "COMPLETED", "WITHDRAWN"].map(
              (s) => ({ value: s, label: s }),
            ),
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="⇄"
            title={lang === "bn" ? "কোনো সাড়া পাওয়া যায়নি" : "No responses found"}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "ডোনার" : "Donor"}</Th>
                  <Th>{lang === "bn" ? "গ্রুপ" : "Group"}</Th>
                  <Th>{lang === "bn" ? "অনুরোধ" : "Request"}</Th>
                  <Th>{lang === "bn" ? "সাড়া" : "Response"}</Th>
                  <Th>{lang === "bn" ? "সাড়ার সময়" : "Responded"}</Th>
                  <Th>{lang === "bn" ? "যোগাযোগ অনুমতি" : "Contact permission"}</Th>
                  <Th>{lang === "bn" ? "আনলক" : "Unlocked"}</Th>
                  <Th>{lang === "bn" ? "তৈরি" : "Created"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.response.id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        href={`/admin/donors/${row.donorProfileId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {row.donorName}
                      </Link>
                    </Td>
                    <Td>
                      <BloodGroupTag group={row.bloodGroup} />
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/requests/${row.requestId}`}
                        className="text-slate-800 hover:underline"
                      >
                        #{row.requestId} · {row.patientName}
                      </Link>
                      <div className="mt-0.5">
                        <StatusBadge status={row.requestStatus} />
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={row.response.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(row.response.respondedAt, lang, true)}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={row.response.contactPermission ? "ACTIVE" : "NOT_AVAILABLE"}
                      />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(row.response.contactUnlockedAt, lang, true)}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(row.response.createdAt, lang)}
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
