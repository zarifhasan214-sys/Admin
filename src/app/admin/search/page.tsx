import Link from "next/link";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bloodRequests,
  donations,
  donorProfiles,
  reports,
  users,
} from "@/db/schema";
import {
  BloodGroupTag,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:dashboard");
  const lang = await getLang();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const like = `%${q}%`;
  const numeric = Number(q);

  const empty = q.length === 0;

  const [userRows, donorRows, requestRows, donationRows, reportRows] =
    await Promise.all([
      empty || !can(actor.role, "view:users")
        ? []
        : db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
              status: users.status,
            })
            .from(users)
            .where(or(ilike(users.name, like), ilike(users.email, like), ilike(users.phone, like)))
            .limit(6),
      empty || !can(actor.role, "view:donors")
        ? []
        : db
            .select({
              id: donorProfiles.id,
              name: users.name,
              bloodGroup: donorProfiles.bloodGroup,
              unionName: donorProfiles.unionName,
              verificationStatus: donorProfiles.verificationStatus,
            })
            .from(donorProfiles)
            .innerJoin(users, eq(users.id, donorProfiles.userId))
            .where(
              or(
                ilike(users.name, like),
                ilike(donorProfiles.phoneNumber, like),
                ilike(donorProfiles.unionName, like),
              ),
            )
            .limit(6),
      empty || !can(actor.role, "view:requests")
        ? []
        : db
            .select({
              id: bloodRequests.id,
              patientName: bloodRequests.patientName,
              hospitalName: bloodRequests.hospital,
              bloodGroup: bloodRequests.bloodGroup,
              status: bloodRequests.status,
            })
            .from(bloodRequests)
            .where(
              or(
                ilike(bloodRequests.patientName, like),
                ilike(bloodRequests.hospital, like),
                ilike(bloodRequests.contactPhone, like),
                ...(Number.isInteger(numeric) ? [eq(bloodRequests.id, numeric)] : []),
              ),
            )
            .limit(6),
      empty || !can(actor.role, "view:donations")
        ? []
        : db
            .select({
              id: donations.id,
              donorName: users.name,
              donationDate: donations.donationDate,
              locationName: donations.locationName,
            })
            .from(donations)
            .innerJoin(donorProfiles, eq(donorProfiles.id, donations.donorProfileId))
            .innerJoin(users, eq(users.id, donorProfiles.userId))
            .where(or(ilike(users.name, like), ilike(donations.locationName, like)))
            .limit(6),
      empty || !can(actor.role, "view:reports")
        ? []
        : db
            .select({
              id: reports.id,
              reason: reports.reason,
              status: reports.status,
              priority: reports.priority,
            })
            .from(reports)
            .where(or(ilike(reports.reason, like), ilike(reports.description, like)))
            .limit(6),
    ]);

  void sql;
  const total =
    userRows.length +
    donorRows.length +
    requestRows.length +
    donationRows.length +
    reportRows.length;

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "গ্লোবাল সার্চ" : "Global search"}
        subtitle={
          q
            ? `${lang === "bn" ? "ফলাফল" : "Results for"} “${q}”`
            : lang === "bn"
              ? "উপরের সার্চ বক্সে লিখুন"
              : "Type in the search box above"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "সার্চ" : "Search" },
        ]}
      />

      {q && total === 0 ? (
        <Card>
          <EmptyState
            icon="⌕"
            title={lang === "bn" ? "কিছু পাওয়া যায়নি" : "Nothing found"}
            description={
              lang === "bn"
                ? "অন্য কীওয়ার্ড দিয়ে চেষ্টা করুন।"
                : "Try a different keyword."
            }
          />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {userRows.length > 0 ? (
          <Card>
            <CardHeader title={`${lang === "bn" ? "ব্যবহারকারী" : "Users"} (${userRows.length})`} />
            <ul className="divide-y divide-slate-100">
              {userRows.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                  >
                    {u.name} · {u.email}
                  </Link>
                  <StatusBadge status={u.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {donorRows.length > 0 ? (
          <Card>
            <CardHeader title={`${lang === "bn" ? "রক্তদাতা" : "Donors"} (${donorRows.length})`} />
            <ul className="divide-y divide-slate-100">
              {donorRows.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                  <BloodGroupTag group={d.bloodGroup} />
                  <Link
                    href={`/admin/donors/${d.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                  >
                    {d.name} · {d.unionName ?? "—"}
                  </Link>
                  <StatusBadge status={d.verificationStatus} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {requestRows.length > 0 ? (
          <Card>
            <CardHeader title={`${lang === "bn" ? "রক্তের অনুরোধ" : "Requests"} (${requestRows.length})`} />
            <ul className="divide-y divide-slate-100">
              {requestRows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <BloodGroupTag group={r.bloodGroup} />
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                  >
                    #{r.id} {r.patientName} · {r.hospitalName}
                  </Link>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {donationRows.length > 0 ? (
          <Card>
            <CardHeader title={`${lang === "bn" ? "রক্তদান" : "Donations"} (${donationRows.length})`} />
            <ul className="divide-y divide-slate-100">
              {donationRows.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    {d.donorName} · {d.locationName ?? "—"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {fmtDate(d.donationDate, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {reportRows.length > 0 ? (
          <Card>
            <CardHeader title={`${lang === "bn" ? "রিপোর্ট" : "Reports"} (${reportRows.length})`} />
            <ul className="divide-y divide-slate-100">
              {reportRows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Link
                    href="/admin/reports"
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                  >
                    #{r.id} {r.reason}
                  </Link>
                  <StatusBadge status={r.priority} />
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
