import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  bloodRequests,
  donorProfiles,
  donorRequests,
  users,
} from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { ActivityTimeline } from "@/components/admin/activity";
import {
  BloodGroupTag,
  Card,
  CardHeader,
  DetailRow,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";
import { REQUIRES_NOTE, TRANSITIONS, type RequestStatus } from "@/lib/request-flow";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdminPage("view:requests");
  const lang = await getLang();
  const id = (await params).id;
  if (!Number.isInteger(id)) notFound();

  const [row] = await db
    .select({ request: bloodRequests, requester: users })
    .from(bloodRequests)
    .innerJoin(users, eq(users.id, bloodRequests.requesterId))
    .where(eq(bloodRequests.id, id))
    .limit(1);
  if (!row) notFound();
  const { request: r, requester } = row;

  const [responses, logs] = await Promise.all([
    db
      .select({
        response: donorRequests,
        donorName: users.name,
        donorId: donorProfiles.id,
        bloodGroup: donorProfiles.bloodGroup,
      })
      .from(donorRequests)
      .innerJoin(donorProfiles, eq(donorProfiles.id, donorRequests.donorId))
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(eq(donorRequests.requestId, id))
      .orderBy(desc(donorRequests.createdAt)),
    db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, "BLOOD_REQUEST"),
          eq(auditLogs.resourceId, String(id)),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(15),
  ]);

  const canModerate = can(actor.role, "moderate:requests");
  const next = TRANSITIONS[r.status as RequestStatus];

  return (
    <div>
      <PageHeader
        title={`${r.patientName} · #${r.id}`}
          subtitle={`${r.bloodGroup} · ${r.quantityUnits} ${lang === "bn" ? "ইউনিট" : "units"} · ${r.hospital}`}
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          {
            label: lang === "bn" ? "রক্তের অনুরোধ" : "Blood requests",
            href: "/admin/requests",
          },
          { label: `#${r.id}` },
        ]}
        actions={
          canModerate && next.length > 0 ? (
            next.map((s) => (
              <ActionButton
                key={s}
                lang={lang}
                size="md"
                tone={
                  s === "VERIFIED" || s === "COMPLETED"
                    ? "success"
                    : s === "REJECTED" || s === "CANCELLED"
                      ? "danger"
                      : "neutral"
                }
                requireNote={REQUIRES_NOTE.includes(s)}
                endpoint={`/api/admin/requests/${r.id}/status`}
                payload={{ status: s }}
                label={s.replaceAll("_", " ")}
                confirmTitle={
                  lang === "bn"
                    ? `অবস্থা পরিবর্তন করে ${s.replaceAll("_", " ")} করবেন?`
                    : `Change status to ${s.replaceAll("_", " ")}?`
                }
                confirmBody={
                  lang === "bn"
                    ? "পরিবর্তনটি অডিট লগে সংরক্ষিত হবে।"
                    : "This change is recorded in the audit log."
                }
              />
            ))
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={lang === "bn" ? "রোগী ও রক্তের চাহিদা" : "Patient & requirement"} />
            <dl>
              <DetailRow label={lang === "bn" ? "রোগীর নাম" : "Patient name"}>
                {r.patientName}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "বয়স" : "Age"}>
                —
              </DetailRow>
              <DetailRow label={lang === "bn" ? "রক্তের গ্রুপ" : "Blood group"}>
                <BloodGroupTag group={r.bloodGroup} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "প্রয়োজনীয় ইউনিট" : "Units required"}>
                {r.unitsRequired}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "প্রয়োজনের তারিখ" : "Required date"}>
                {fmtDate(r.requiredDate, lang)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "জরুরিতা" : "Urgency"}>
                <StatusBadge status={r.urgency} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "হাসপাতাল" : "Hospital"}>
                {r.hospitalName}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "হাসপাতালের ঠিকানা" : "Hospital address"}>
                {r.hospitalAddress ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "অবস্থান" : "Location"}>
                {[r.unionName, r.upazila, r.district].filter(Boolean).join(", ") || "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "বিবরণ" : "Description"}>
                {r.description ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "প্রমাণপত্র" : "Proof document"}>
                {r.proofDocumentUrl ? (
                  <a
                    href={r.proofDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-700 hover:underline"
                  >
                    {lang === "bn" ? "ডকুমেন্ট দেখুন" : "Open document"}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={lang === "bn" ? "ডোনার সাড়া" : "Donor responses"}
              subtitle={`${responses.length} ${lang === "bn" ? "টি সাড়া" : "responses"}`}
            />
            {responses.length === 0 ? (
              <EmptyState
                icon="⇄"
                title={lang === "bn" ? "কোনো সাড়া নেই" : "No donor responses yet"}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {responses.map(({ response, donorName, donorId, bloodGroup }) => (
                  <li
                    key={response.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <BloodGroupTag group={bloodGroup} />
                    <Link
                      href={`/admin/donors/${donorId}`}
                      className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                    >
                      {donorName}
                    </Link>
                    <StatusBadge status={response.status} />
                    <span className="text-[11px] text-slate-400">
                      {fmtDate(response.donorAcceptedAt ?? response.createdAt, lang, true)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={lang === "bn" ? "টাইমলাইন ও অডিট" : "Timeline & audit"} />
            <ActivityTimeline logs={logs} lang={lang} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={lang === "bn" ? "অবস্থা" : "Status"} />
            <dl>
              <DetailRow label={lang === "bn" ? "বর্তমান" : "Current"}>
                <StatusBadge status={r.status} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "যাচাইয়ের সময়" : "Verified at"}>
                {fmtDate(r.verifiedAt, lang, true)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "নোট" : "Status note"}>
                {r.statusNote ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "তৈরি" : "Created"}>
                {fmtDate(r.createdAt, lang, true)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "সম্ভাব্য পরবর্তী ধাপ" : "Allowed next steps"}>
                {next.length ? next.join(", ").replaceAll("_", " ") : "—"}
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title={lang === "bn" ? "যোগাযোগ ও অনুরোধকারী" : "Contact & requester"} />
            <dl>
              <DetailRow label={lang === "bn" ? "যোগাযোগের নাম" : "Contact name"}>
                {r.contactName ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ফোন" : "Phone"}>
                {r.contactPhone}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "অনুরোধকারী" : "Requester"}>
                <Link
                  href={`/admin/users/${requester.id}`}
                  className="text-red-700 hover:underline"
                >
                  {requester.name}
                </Link>
              </DetailRow>
              <DetailRow label={lang === "bn" ? "অ্যাকাউন্ট অবস্থা" : "Account status"}>
                <StatusBadge status={requester.status} />
              </DetailRow>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
