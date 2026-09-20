import Link from "next/link";
import { ActivityTimeline } from "@/components/admin/activity";
import { BarList, Donut, TimeSeries } from "@/components/admin/charts";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  BloodGroupTag,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  availabilityBreakdown,
  bloodGroupBreakdown,
  criticalOpenRequests,
  dailySeries,
  getDashboardStats,
  pendingVerificationDonors,
  recentAudit,
  requestStatusBreakdown,
  urgencyBreakdown,
} from "@/lib/admin-stats";
import { fmtDate, fmtNumber } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function AdminDashboardPage() {
  const user = await requireAdminPage("view:dashboard");
  const lang = await getLang();

  const [
    stats,
    userSeries,
    donorSeries,
    statusMix,
    groupMix,
    availability,
    urgency,
    logs,
    pendingDonors,
    criticals,
  ] = await Promise.all([
    getDashboardStats(),
    dailySeries("users", 30),
    dailySeries("donor_profiles", 30),
    requestStatusBreakdown(),
    bloodGroupBreakdown(),
    availabilityBreakdown(),
    urgencyBreakdown(),
    recentAudit(10),
    pendingVerificationDonors(5),
    criticalOpenRequests(5),
  ]);

  const today = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date());

  const kpis = [
    { label: lang === "bn" ? "মোট ব্যবহারকারী" : "Total users", value: stats.totalUsers, icon: "◔", href: "/admin/users", hint: lang === "bn" ? "নিবন্ধিত অ্যাকাউন্ট" : "Registered accounts", tone: "neutral" as const },
    { label: lang === "bn" ? "সক্রিয় ব্যবহারকারী" : "Active users", value: stats.activeUsers, icon: "●", href: "/admin/users?status=ACTIVE", hint: lang === "bn" ? "স্ট্যাটাস ACTIVE" : "Status ACTIVE", tone: "success" as const },
    { label: lang === "bn" ? "মোট রক্তদাতা" : "Total donors", value: stats.totalDonors, icon: "♥", href: "/admin/donors", hint: lang === "bn" ? "ডোনার প্রোফাইল" : "Donor profiles", tone: "critical" as const },
    { label: lang === "bn" ? "যাচাইকৃত ডোনার" : "Verified donors", value: stats.verifiedDonors, icon: "✓", href: "/admin/donors?verification=VERIFIED", hint: lang === "bn" ? "যাচাই সম্পন্ন" : "Verification complete", tone: "success" as const },
    { label: lang === "bn" ? "উপলব্ধ ডোনার" : "Available donors", value: stats.availableDonors, icon: "◎", href: "/admin/donors?availability=AVAILABLE&verification=VERIFIED", hint: lang === "bn" ? "যাচাইকৃত ও উপলব্ধ" : "Verified & available", tone: "success" as const },
    { label: lang === "bn" ? "যাচাইয়ের অপেক্ষায়" : "Pending verification", value: stats.pendingDonorVerification, icon: "⏳", href: "/admin/verification", hint: lang === "bn" ? "ডোনার রিভিউ প্রয়োজন" : "Donor review needed", tone: "warning" as const },
    { label: lang === "bn" ? "মোট অনুরোধ" : "Total requests", value: stats.totalRequests, icon: "⛑", href: "/admin/requests", hint: lang === "bn" ? "সব রক্তের অনুরোধ" : "All blood requests", tone: "neutral" as const },
    { label: lang === "bn" ? "পেন্ডিং অনুরোধ" : "Pending requests", value: stats.pendingRequests, icon: "⏱", href: "/admin/requests?status=PENDING_REVIEW", hint: lang === "bn" ? "যাচাইয়ের অপেক্ষায়" : "Awaiting review", tone: "warning" as const },
    { label: lang === "bn" ? "সক্রিয়/জরুরি" : "Active / critical", value: stats.activeRequests, icon: "⚡", href: "/admin/requests?bucket=active", hint: lang === "bn" ? `${fmtNumber(stats.criticalRequests, lang)} টি CRITICAL` : `${stats.criticalRequests} critical`, tone: "critical" as const },
    { label: lang === "bn" ? "সম্পন্ন অনুরোধ" : "Completed requests", value: stats.completedRequests, icon: "✔", href: "/admin/requests?status=COMPLETED", hint: lang === "bn" ? "সফলভাবে সম্পন্ন" : "Successfully fulfilled", tone: "success" as const },
    { label: lang === "bn" ? "খোলা রিপোর্ট" : "Open reports", value: stats.openReports, icon: "⚑", href: "/admin/reports?bucket=open", hint: lang === "bn" ? "মডারেশন প্রয়োজন" : "Needs moderation", tone: "warning" as const },
    { label: lang === "bn" ? "সম্পন্ন রক্তদান" : "Donations recorded", value: stats.completedDonations, icon: "◉", href: "/admin/donations", hint: lang === "bn" ? "রেকর্ডকৃত রক্তদান" : "Recorded donations", tone: "info" as const },
  ];

  const alerts = [
    {
      count: stats.pendingDonorVerification,
      href: "/admin/verification",
      bn: `${fmtNumber(stats.pendingDonorVerification, "bn")}টি ডোনার প্রোফাইল যাচাইয়ের অপেক্ষায়`,
      en: `${stats.pendingDonorVerification} donor profiles awaiting verification`,
    },
    {
      count: stats.pendingRequests,
      href: "/admin/requests?status=PENDING_REVIEW",
      bn: `${fmtNumber(stats.pendingRequests, "bn")}টি Blood Request verification-এর অপেক্ষায়`,
      en: `${stats.pendingRequests} blood requests awaiting verification`,
    },
    {
      count: stats.criticalRequests,
      href: "/admin/requests?urgency=CRITICAL",
      bn: `${fmtNumber(stats.criticalRequests, "bn")}টি CRITICAL অনুরোধ চলমান`,
      en: `${stats.criticalRequests} critical requests in progress`,
    },
    {
      count: stats.criticalReports,
      href: "/admin/reports?priority=HIGH",
      bn: `${fmtNumber(stats.criticalReports, "bn")}টি উচ্চ অগ্রাধিকারের রিপোর্ট খোলা আছে`,
      en: `${stats.criticalReports} high priority reports are open`,
    },
    {
      count: stats.suspendedAccounts,
      href: "/admin/suspended",
      bn: `${fmtNumber(stats.suspendedAccounts, "bn")}টি অ্যাকাউন্ট স্থগিত অবস্থায় আছে`,
      en: `${stats.suspendedAccounts} accounts are currently suspended`,
    },
    {
      count: stats.expiringRequests,
      href: "/admin/requests?bucket=expiring",
      bn: `${fmtNumber(stats.expiringRequests, "bn")}টি অনুরোধের সময় শেষ হয়ে আসছে`,
      en: `${stats.expiringRequests} requests are close to their required date`,
    },
  ].filter((a) => a.count > 0);

  return (
    <div>
      <PageHeader
        title={
          lang === "bn"
            ? `স্বাগতম, ${user.name.split(" ")[0]}`
            : `Welcome, ${user.name.split(" ")[0]}`
        }
        subtitle={`${today} · ${user.role.replaceAll("_", " ")} · ${
          lang === "bn" ? "সিস্টেম স্বাভাবিক" : "System operational"
        }`}
      />

      <section
        aria-label="KPI"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      >
        {kpis.map((k) => (
          <StatCard key={k.label} lang={lang} {...k} />
        ))}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={lang === "bn" ? "ব্যবহারকারী বৃদ্ধি (৩০ দিন)" : "User growth (30 days)"}
            subtitle={lang === "bn" ? "দৈনিক নতুন নিবন্ধন" : "Daily new registrations"}
          />
          <TimeSeries
            points={userSeries}
            lang={lang}
            emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"}
          />
        </Card>
        <Card>
          <CardHeader
            title={lang === "bn" ? "ডোনার বৃদ্ধি (৩০ দিন)" : "Donor growth (30 days)"}
          />
          <TimeSeries
            points={donorSeries}
            color="#0284c7"
            lang={lang}
            emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"}
          />
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title={lang === "bn" ? "অনুরোধের অবস্থা" : "Request status"} />
          <BarList items={statusMix} lang={lang} emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "রক্তের গ্রুপ বণ্টন" : "Blood group distribution"} />
          <BarList items={groupMix} lang={lang} emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "ডোনার উপলব্ধতা" : "Donor availability"} />
          <Donut items={availability} lang={lang} emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"} />
        </Card>
        <Card>
          <CardHeader title={lang === "bn" ? "অনুরোধের জরুরিতা" : "Request urgency"} />
          <Donut items={urgency} lang={lang} emptyLabel={lang === "bn" ? "কোনো তথ্য নেই" : "No data"} />
        </Card>
      </section>

      <section id="alerts" className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={lang === "bn" ? "যা মনোযোগ প্রয়োজন" : "Attention required"}
            subtitle={
              lang === "bn"
                ? "রিয়েল-টাইম অপারেশনাল সতর্কতা"
                : "Real-time operational alerts"
            }
          />
          {alerts.length === 0 ? (
            <EmptyState
              icon="✅"
              title={
                lang === "bn"
                  ? "এই মুহূর্তে কোনো বিষয় মনোযোগের অপেক্ষায় নেই"
                  : "Nothing needs attention right now"
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <li
                  key={a.href}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <span className="text-sm text-slate-700">
                    {lang === "bn" ? a.bn : a.en}
                  </span>
                  <Link
                    href={a.href}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {lang === "bn" ? "রিভিউ" : "Review"}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <CardHeader title={lang === "bn" ? "জরুরি অনুরোধ" : "Critical requests"} />
          {criticals.length === 0 ? (
            <EmptyState
              icon="🩸"
              title={
                lang === "bn"
                  ? "এই মুহূর্তে কোনো critical অনুরোধ নেই"
                  : "No critical requests right now"
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {criticals.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <BloodGroupTag group={r.bloodGroup} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      {r.patientName}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {r.hospitalName} · {fmtDate(r.requiredDate, lang)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={lang === "bn" ? "যাচাই কিউ" : "Verification queue"}
              action={
                <Link
                  href="/admin/verification"
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  {lang === "bn" ? "সব দেখুন" : "View all"}
                </Link>
              }
            />
            {pendingDonors.length === 0 ? (
              <EmptyState
                icon="✅"
                title={lang === "bn" ? "কিউ খালি" : "Queue is empty"}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingDonors.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <BloodGroupTag group={d.bloodGroup} />
                    <Link
                      href={`/admin/donors/${d.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                    >
                      {d.name}
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {fmtDate(d.updatedAt, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title={lang === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent activity"}
              action={
                <Link
                  href="/admin/audit-logs"
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  {lang === "bn" ? "সব লগ" : "All logs"}
                </Link>
              }
            />
            <ActivityTimeline logs={logs} lang={lang} />
          </Card>
        </div>
      </section>
    </div>
  );
}
