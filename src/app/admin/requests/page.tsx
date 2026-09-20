import Link from "next/link";
import { and, count, desc, eq, gte, ilike, inArray, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, users } from "@/db/schema";
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

const PAGE_SIZE = 20;
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUSES = [
  "PENDING_REVIEW",
  "VERIFIED",
  "SEARCHING_FOR_DONOR",
  "DONOR_CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:requests");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = get("q");
  const group = get("group");
  const status = get("status");
  const urgency = get("urgency");
  const bucket = get("bucket");
  const from = get("from");
  const to = get("to");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const numeric = Number(q);
    const term = or(
      ilike(bloodRequests.patientName, like),
      ilike(bloodRequests.hospital, like),
      ilike(bloodRequests.contactPhone, like),
      ...(Number.isInteger(numeric) ? [eq(bloodRequests.id, numeric)] : []),
    );
    if (term) filters.push(term);
  }
  if (group) filters.push(eq(bloodRequests.bloodGroup, group as "A+"));
  if (status) filters.push(eq(bloodRequests.status, status as "VERIFIED"));
  if (urgency) filters.push(eq(bloodRequests.urgency, urgency as "URGENT"));
  if (bucket === "active")
    filters.push(
      inArray(bloodRequests.status, [
        "VERIFIED",
        "SEARCHING_FOR_DONOR",
        "DONOR_CONTACTED",
        "ACCEPTED",
      ]),
    );
  if (bucket === "expiring") {
    filters.push(
      inArray(bloodRequests.status, [
        "VERIFIED",
        "SEARCHING_FOR_DONOR",
        "DONOR_CONTACTED",
      ]),
    );
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    filters.push(lte(bloodRequests.requiredDate, soon.toISOString().slice(0, 10)));
  }
  if (from) filters.push(gte(bloodRequests.createdAt, new Date(from)));
  if (to) filters.push(lte(bloodRequests.createdAt, new Date(`${to}T23:59:59`)));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        request: bloodRequests,
        requesterName: users.name,
      })
      .from(bloodRequests)
      .innerJoin(users, eq(users.id, bloodRequests.requesterId))
      .where(where)
      .orderBy(desc(bloodRequests.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(bloodRequests).where(where),
  ]);

  const query: Record<string, string | undefined> = {
    q,
    group,
    status,
    urgency,
    bucket,
    from,
    to,
  };

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "রক্তের অনুরোধ" : "Blood requests"}
        subtitle={
          lang === "bn"
            ? "অনুরোধ যাচাই, অগ্রাধিকার ও অবস্থা ব্যবস্থাপনা"
            : "Verify, prioritise and manage request status"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "রক্তের অনুরোধ" : "Blood requests" },
        ]}
        actions={
          <Link
            href="/admin/requests?urgency=CRITICAL&bucket=active"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            {lang === "bn" ? "জরুরি অনুরোধ" : "Critical queue"}
          </Link>
        }
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={
          lang === "bn"
            ? "রোগীর নাম, হাসপাতাল, ফোন বা আইডি…"
            : "Patient, hospital, phone or ID…"
        }
        exportHref={`/api/admin/export/requests?${new URLSearchParams(
          Object.entries(query).filter(([, v]) => v) as [string, string][],
        ).toString()}`}
        fields={[
          {
            type: "select",
            name: "status",
            label: lang === "bn" ? "অবস্থা" : "Status",
            options: STATUSES.map((s) => ({ value: s, label: s.replaceAll("_", " ") })),
          },
          {
            type: "select",
            name: "urgency",
            label: lang === "bn" ? "জরুরিতা" : "Urgency",
            options: ["ROUTINE", "URGENT", "CRITICAL"].map((s) => ({
              value: s,
              label: s,
            })),
          },
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
            icon="⛑"
            title={
              lang === "bn"
                ? "এই মুহূর্তে কোনো request নেই"
                : "No requests match these filters"
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "রোগী" : "Patient"}</Th>
                  <Th>{lang === "bn" ? "গ্রুপ / ইউনিট" : "Group / units"}</Th>
                  <Th>{lang === "bn" ? "হাসপাতাল" : "Hospital"}</Th>
                  <Th>{lang === "bn" ? "অবস্থান" : "Location"}</Th>
                  <Th>{lang === "bn" ? "প্রয়োজনের তারিখ" : "Required"}</Th>
                  <Th>{lang === "bn" ? "জরুরিতা" : "Urgency"}</Th>
                  <Th>{lang === "bn" ? "যোগাযোগ" : "Contact"}</Th>
                  <Th>{lang === "bn" ? "অনুরোধকারী" : "Requester"}</Th>
                  <Th>{lang === "bn" ? "অবস্থা" : "Status"}</Th>
                  <Th>{lang === "bn" ? "তৈরি" : "Created"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ request: r, requesterName }) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {r.patientName}
                      </Link>
                      <div className="text-[11px] text-slate-400">#{r.id}</div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <BloodGroupTag group={r.bloodGroup} />{" "}
                      <span className="text-xs text-slate-500">
                        × {r.unitsRequired}
                      </span>
                    </Td>
                    <Td className="text-slate-700">{r.hospitalName}</Td>
                    <Td className="text-slate-600">
                      {r.unionName ?? "—"}
                      <div className="text-[11px] text-slate-400">
                        {r.upazila}, {r.district}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(r.requiredDate, lang)}
                    </Td>
                    <Td>
                      <StatusBadge status={r.urgency} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {r.contactPhone}
                    </Td>
                    <Td className="text-slate-600">{requesterName}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {r.verifiedAt
                          ? lang === "bn"
                            ? "যাচাইকৃত"
                            : "Verified"
                          : lang === "bn"
                            ? "যাচাই হয়নি"
                            : "Not verified"}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(r.createdAt, lang)}
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
