import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donations, donorProfiles, users } from "@/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  BloodGroupTag,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const PAGE_SIZE = 25;
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const dynamic = "force-dynamic";

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:donations");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const group = get("group");
  const from = get("from");
  const to = get("to");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(ilike(users.name, like), ilike(donations.locationName, like));
    if (term) filters.push(term);
  }
  if (group) filters.push(eq(donations.bloodGroup, group as "A+"));
  if (from) filters.push(gte(donations.donationDate, from));
  if (to) filters.push(lte(donations.donationDate, to));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        donation: donations,
        donorName: users.name,
        donorProfileId: donorProfiles.id,
      })
      .from(donations)
      .innerJoin(donorProfiles, eq(donorProfiles.id, donations.donorProfileId))
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(where)
      .orderBy(desc(donations.donationDate))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ value: count() })
      .from(donations)
      .innerJoin(donorProfiles, eq(donorProfiles.id, donations.donorProfileId))
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(where),
  ]);

  const query = { q, group, from, to };

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "রক্তদান রেকর্ড" : "Donation records"}
        subtitle={
          lang === "bn"
            ? "সম্পন্ন রক্তদানের অডিটযোগ্য রেকর্ড"
            : "Auditable records of completed donations"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "রক্তদান" : "Donations" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "ডোনার বা স্থান…" : "Donor or location…"}
        exportHref={`/api/admin/export/donations?${new URLSearchParams(
          Object.entries(query).filter(([, v]) => v) as [string, string][],
        ).toString()}`}
        fields={[
          {
            type: "select",
            name: "group",
            label: lang === "bn" ? "গ্রুপ" : "Group",
            options: GROUPS.map((g) => ({ value: g, label: g })),
          },
          { type: "date", name: "from", label: lang === "bn" ? "শুরু" : "From" },
          { type: "date", name: "to", label: lang === "bn" ? "শেষ" : "To" },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="◉"
            title={lang === "bn" ? "কোনো রেকর্ড পাওয়া যায়নি" : "No donation records found"}
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "ডোনার" : "Donor"}</Th>
                  <Th>{lang === "bn" ? "গ্রুপ" : "Group"}</Th>
                  <Th>{lang === "bn" ? "তারিখ" : "Date"}</Th>
                  <Th>{lang === "bn" ? "স্থান" : "Location"}</Th>
                  <Th>{lang === "bn" ? "সম্পর্কিত অনুরোধ" : "Related request"}</Th>
                  <Th>{lang === "bn" ? "নোট" : "Notes"}</Th>
                  <Th>{lang === "bn" ? "নিয়ম সংস্করণ" : "Rule version"}</Th>
                  <Th>{lang === "bn" ? "রেকর্ডের সময়" : "Recorded"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ donation: d, donorName, donorProfileId }) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        href={`/admin/donors/${donorProfileId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {donorName}
                      </Link>
                    </Td>
                    <Td>
                      <BloodGroupTag group={d.bloodGroup} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-700">
                      {fmtDate(d.donationDate, lang)}
                    </Td>
                    <Td className="text-slate-600">
                      {d.locationName ?? "—"}
                      <div className="text-[11px] text-slate-400">
                        {[d.upazila, d.district].filter(Boolean).join(", ")}
                      </div>
                    </Td>
                    <Td>
                      {d.requestId ? (
                        <Link
                          href={`/admin/requests/${d.requestId}`}
                          className="text-red-700 hover:underline"
                        >
                          #{d.requestId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="max-w-xs truncate text-slate-600">
                      {d.notes ?? "—"}
                    </Td>
                    <Td className="text-slate-600">{d.ruleVersion ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(d.createdAt, lang)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={totalRow?.value ?? 0}
              baseQuery={query}
              lang={lang}
            />
          </>
        )}
      </Card>
    </div>
  );
}
