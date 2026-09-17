import Link from "next/link";
import { and, count, gte, lte, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  bloodRequests,
  donations,
  donorProfiles,
  reports,
  users,
} from "@/db/schema";
import { BarList, Donut, TimeSeries } from "@/components/admin/charts";
import {
  Card,
  CardHeader,
  PageHeader,
  StatCard,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  availabilityBreakdown,
  bloodGroupBreakdown,
  dailySeries,
  requestStatusBreakdown,
  urgencyBreakdown,
} from "@/lib/admin-stats";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "1", bn: "আজ", en: "Today" },
  { key: "7", bn: "৭ দিন", en: "7 days" },
  { key: "30", bn: "৩০ দিন", en: "30 days" },
  { key: "90", bn: "৯০ দিন", en: "90 days" },
  { key: "365", bn: "১ বছর", en: "1 year" },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:analytics");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const rangeKey = get("range") || "30";
  const customFrom = get("from");
  const customTo = get("to");

  const days = Number(rangeKey) || 30;
  const now = new Date();
  const from = customFrom
    ? new Date(customFrom)
    : new Date(now.getTime() - (days - 1) * 86400_000);
  const to = customTo ? new Date(`${customTo}T23:59:59`) : now;

  const range = (col: PgColumn): SQL => and(gte(col, from), lte(col, to)) as SQL;

  const [
    [userStats],
    [donorStats],
    [requestStats],
    [donationStats],
    [moderationStats],
    userSeries,
    donationSeries,
    statusMix,
    groupMix,
    availability,
    urgency,
    locationMix,
    donationGroupMix,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        verified: sql<number>`count(*) filter (where ${users.emailVerified})::int`,
        active: sql<number>`count(*) filter (where ${users.status} = 'ACTIVE')::int`,
      })
      .from(users)
      .where(range(users.createdAt)),
    db
      .select({
        total: count(),
        verified: sql<number>`count(*) filter (where ${donorProfiles.verificationStatus} = 'VERIFIED')::int`,
        available: sql<number>`count(*) filter (where ${donorProfiles.availability} = 'AVAILABLE')::int`,
      })
      .from(donorProfiles)
      .where(range(donorProfiles.createdAt)),
    db
      .select({
        total: count(),
        verified: sql<number>`count(*) filter (where ${bloodRequests.status} <> 'PENDING_REVIEW')::int`,
        completed: sql<number>`count(*) filter (where ${bloodRequests.status} = 'COMPLETED')::int`,
        rejected: sql<number>`count(*) filter (where ${bloodRequests.status} = 'REJECTED')::int`,
        cancelled: sql<number>`count(*) filter (where ${bloodRequests.status} = 'CANCELLED')::int`,
        expired: sql<number>`count(*) filter (where ${bloodRequests.status} = 'EXPIRED')::int`,
      })
      .from(bloodRequests)
      .where(range(bloodRequests.createdAt)),
    db
      .select({ total: count() })
      .from(donations)
      .where(range(donations.createdAt)),
    db
      .select({
        total: count(),
        resolved: sql<number>`count(*) filter (where ${reports.status} = 'RESOLVED')::int`,
        open: sql<number>`count(*) filter (where ${reports.status} in ('PENDING','UNDER_REVIEW'))::int`,
      })
      .from(reports)
      .where(range(reports.createdAt)),
    dailySeries("users", Math.min(Math.max(days, 7), 90)),
    dailySeries("donations", Math.min(Math.max(days, 7), 90)),
    requestStatusBreakdown(from),
    bloodGroupBreakdown(),
    availabilityBreakdown(),
    urgencyBreakdown(from),
    db
      .select({ label: bloodRequests.unionName, value: count() })
      .from(bloodRequests)
      .where(range(bloodRequests.createdAt))
      .groupBy(bloodRequests.unionName)
      .orderBy(sql`count(*) desc`)
      .limit(8),
    db
      .select({ label: donations.bloodGroup, value: count() })
      .from(donations)
      .where(range(donations.createdAt))
      .groupBy(donations.bloodGroup),
  ]);

  const canExport = can(actor.role, "export:data");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "বিশ্লেষণ ও রিপোর্ট" : "Analytics & reports"}
        subtitle={
          lang === "bn"
            ? "সব সংখ্যা সরাসরি ডাটাবেস অ্যাগ্রিগেশন থেকে গণনা করা"
            : "Every number is aggregated directly from the database"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "বিশ্লেষণ" : "Analytics" },
        ]}
        actions={
          canExport ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/admin/export/donations"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {lang === "bn" ? "রক্তদান CSV" : "Donations CSV"}
            </a>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/admin/analytics?range=${r.key}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              rangeKey === r.key && !customFrom
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {lang === "bn" ? r.bn : r.en}
          </Link>
        ))}
        <form className="ml-auto flex flex-wrap items-end gap-2" action="/admin/analytics">
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{lang === "bn" ? "শুরু" : "From"}</span>
            <input
              type="date"
              name="from"
              defaultValue={customFrom}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">{lang === "bn" ? "শেষ" : "To"}</span>
            <input
              type="date"
              name="to"
              defaultValue={customTo}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            {lang === "bn" ? "প্রয়োগ" : "Apply"}
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard lang={lang} label={lang === "bn" ? "নতুন ব্যবহারকারী" : "New users"} value={userStats?.total ?? 0} icon="◔" />
        <StatCard lang={lang} label={lang === "bn" ? "যাচাইকৃত অ্যাকাউন্ট" : "Verified accounts"} value={userStats?.verified ?? 0} icon="✓" tone="success" />
        <StatCard lang={lang} label={lang === "bn" ? "নতুন ডোনার" : "New donors"} value={donorStats?.total ?? 0} icon="♥" tone="critical" />
        <StatCard lang={lang} label={lang === "bn" ? "নতুন অনুরোধ" : "New requests"} value={requestStats?.total ?? 0} icon="⛑" />
        <StatCard lang={lang} label={lang === "bn" ? "সম্পন্ন অনুরোধ" : "Completed"} value={requestStats?.completed ?? 0} icon="✔" tone="success" />
        <StatCard lang={lang} label={lang === "bn" ? "রক্তদান" : "Donations"} value={donationStats?.total ?? 0} icon="◉" tone="info" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={lang === "bn" ? "ব্যবহারকারী বৃদ্ধি" : "User growth"} />
          <TimeSeries points={userSeries} lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "রক্তদান প্রবণতা" : "Donations over time"} />
          <TimeSeries points={donationSeries} color="#059669" lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={lang === "bn" ? "অনুরোধের অবস্থা" : "Requests by status"} />
          <BarList items={statusMix} lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "ডোনার রক্তের গ্রুপ" : "Donors by blood group"} />
          <BarList items={groupMix} lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "রক্তদান — গ্রুপ অনুযায়ী" : "Donations by blood group"} />
          <BarList
            items={donationGroupMix.map((d) => ({ label: d.label, value: d.value }))}
            lang={lang}
            emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"}
          />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "অনুরোধ — এলাকা অনুযায়ী" : "Requests by location"} />
          <BarList
            items={locationMix.map((l) => ({ label: l.label ?? "—", value: l.value }))}
            lang={lang}
            emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"}
          />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "ডোনার উপলব্ধতা" : "Donor availability"} />
          <Donut items={availability} lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "জরুরিতা" : "Urgency mix"} />
          <Donut items={urgency} lang={lang} emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"} />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={lang === "bn" ? "অনুরোধের ফলাফল" : "Request outcomes"} />
          <BarList
            lang={lang}
            emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"}
            items={[
              { label: lang === "bn" ? "যাচাইকৃত" : "Verified", value: requestStats?.verified ?? 0 },
              { label: lang === "bn" ? "সম্পন্ন" : "Completed", value: requestStats?.completed ?? 0 },
              { label: lang === "bn" ? "প্রত্যাখ্যাত" : "Rejected", value: requestStats?.rejected ?? 0 },
              { label: lang === "bn" ? "বাতিল" : "Cancelled", value: requestStats?.cancelled ?? 0 },
              { label: lang === "bn" ? "মেয়াদোত্তীর্ণ" : "Expired", value: requestStats?.expired ?? 0 },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "ডোনার সারাংশ" : "Donor summary"} />
          <BarList
            lang={lang}
            emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"}
            items={[
              { label: lang === "bn" ? "নতুন ডোনার" : "New donors", value: donorStats?.total ?? 0 },
              { label: lang === "bn" ? "যাচাইকৃত" : "Verified", value: donorStats?.verified ?? 0 },
              { label: lang === "bn" ? "উপলব্ধ" : "Available", value: donorStats?.available ?? 0 },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "মডারেশন" : "Moderation"} />
          <BarList
            lang={lang}
            emptyLabel={lang === "bn" ? "তথ্য নেই" : "No data"}
            items={[
              { label: lang === "bn" ? "মোট রিপোর্ট" : "Reports", value: moderationStats?.total ?? 0 },
              { label: lang === "bn" ? "নিষ্পত্তি" : "Resolved", value: moderationStats?.resolved ?? 0 },
              { label: lang === "bn" ? "খোলা" : "Open", value: moderationStats?.open ?? 0 },
            ]}
          />
        </Card>
      </section>
    </div>
  );
}
