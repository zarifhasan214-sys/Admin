import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, donations, donorProfiles, users } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { ActivityTimeline } from "@/components/admin/activity";
import {
  Badge,
  BloodGroupTag,
  Card,
  CardHeader,
  DetailRow,
  Disclaimer,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { evaluateEligibility, getActiveRule } from "@/lib/eligibility";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const diff = new Date().getTime() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 86400_000));
}

export default async function DonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdminPage("view:donors");
  const lang = await getLang();
  const donorId = (await params).id;
  if (!Number.isInteger(donorId)) notFound();

  const [row] = await db
    .select({ donor: donorProfiles, user: users })
    .from(donorProfiles)
    .innerJoin(users, eq(users.id, donorProfiles.userId))
    .where(eq(donorProfiles.id, donorId))
    .limit(1);
  if (!row) notFound();
  const { donor, user } = row;

  const [rule, history, logs, verifier] = await Promise.all([
    getActiveRule(),
    db
      .select()
      .from(donations)
      .where(eq(donations.donorProfileId, donorId))
      .orderBy(desc(donations.donationDate))
      .limit(10),
    db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, "DONOR"),
          eq(auditLogs.resourceId, String(donorId)),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(12),
    donor.verifiedBy
      ? db
          .select({ name: users.name, role: users.role })
          .from(users)
          .where(eq(users.id, donor.verifiedBy))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const eligibility = evaluateEligibility(donor, rule);
  const canModerate = can(actor.role, "moderate:donors");
  const canSeeHealth = can(actor.role, "view:health_notes");
  const age = ageFromDob(donor.dateOfBirth);

  return (
    <div>
      <PageHeader
        title={user.name}
        subtitle={`${donor.bloodGroup} · ${donor.unionName ?? ""} ${donor.upazila ?? ""}`}
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "রক্তদাতা" : "Donors", href: "/admin/donors" },
          { label: `#${donor.id}` },
        ]}
        actions={
          canModerate ? (
            <>
              {donor.verificationStatus !== "VERIFIED" ? (
                <ActionButton
                  lang={lang}
                  size="md"
                  tone="success"
                  endpoint={`/api/admin/donors/${donor.id}/verification`}
                  payload={{ status: "VERIFIED" }}
                  label={lang === "bn" ? "যাচাই করুন" : "Verify"}
                  confirmTitle={
                    lang === "bn" ? "ডোনার যাচাই করবেন?" : "Verify this donor?"
                  }
                  confirmBody={
                    lang === "bn"
                      ? "যাচাই করলে ডোনার ডিরেক্টরিতে দৃশ্যমান হতে পারবেন। কাজটি অডিট লগে সংরক্ষিত হবে।"
                      : "Verified donors can appear in the public directory. This action is recorded in the audit log."
                  }
                />
              ) : null}
              {donor.verificationStatus !== "REJECTED" ? (
                <ActionButton
                  lang={lang}
                  size="md"
                  tone="danger"
                  requireNote
                  endpoint={`/api/admin/donors/${donor.id}/verification`}
                  payload={{ status: "REJECTED" }}
                  label={lang === "bn" ? "প্রত্যাখ্যান" : "Reject"}
                  confirmTitle={
                    lang === "bn" ? "যাচাই প্রত্যাখ্যান করবেন?" : "Reject verification?"
                  }
                />
              ) : null}
              {donor.verificationStatus !== "SUSPENDED" ? (
                <ActionButton
                  lang={lang}
                  size="md"
                  tone="neutral"
                  requireNote
                  endpoint={`/api/admin/donors/${donor.id}/verification`}
                  payload={{ status: "SUSPENDED" }}
                  label={lang === "bn" ? "স্থগিত" : "Suspend"}
                  confirmTitle={
                    lang === "bn" ? "ডোনার স্থগিত করবেন?" : "Suspend this donor?"
                  }
                />
              ) : null}
              <ActionButton
                lang={lang}
                size="md"
                tone="neutral"
                endpoint={`/api/admin/donors/${donor.id}/searchable`}
                payload={{ isSearchable: !donor.searchable }}
                label={
                  donor.searchable
                    ? lang === "bn"
                      ? "ডিরেক্টরি থেকে সরান"
                      : "Remove from directory"
                    : lang === "bn"
                      ? "ডিরেক্টরিতে যুক্ত"
                      : "Make searchable"
                }
                confirmTitle={
                  lang === "bn"
                    ? "ডিরেক্টরি স্ট্যাটাস পরিবর্তন করবেন?"
                    : "Change directory visibility?"
                }
              />
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={lang === "bn" ? "প্রোফাইল" : "Profile"} />
            <dl>
              <DetailRow label={lang === "bn" ? "রক্তের গ্রুপ" : "Blood group"}>
                <BloodGroupTag group={donor.bloodGroup} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "লিঙ্গ" : "Gender"}>
                {donor.gender}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "জন্মতারিখ / বয়স" : "DOB / age"}>
                {fmtDate(donor.dateOfBirth, lang)} {age !== null ? `· ${age}` : ""}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ওজন" : "Weight"}>
                {donor.weightKg ? `${donor.weightKg} kg` : "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ফোন" : "Phone"}>
                {donor.phoneNumber ?? user.phone ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ইমেইল" : "Email"}>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="text-red-700 hover:underline"
                >
                  {user.email}
                </Link>
              </DetailRow>
              <DetailRow label={lang === "bn" ? "অবস্থান" : "Location"}>
                {[donor.area, donor.unionName, donor.upazila, donor.district]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "প্রোফাইল পূর্ণতা" : "Profile completion"}>
                {donor.profileCompletion}%
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={lang === "bn" ? "রক্তদানের ইতিহাস" : "Donation history"}
              subtitle={`${donor.donationCount} ${lang === "bn" ? "বার রক্তদান" : "recorded donations"}`}
            />
            {history.length === 0 ? (
              <EmptyState
                icon="◉"
                title={
                  lang === "bn" ? "কোনো রক্তদান রেকর্ড নেই" : "No donation records"
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                  >
                    <span className="font-medium text-slate-800">
                      {fmtDate(h.donationDate, lang)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {h.locationName ?? "—"}
                    </span>
                    {h.requestId ? (
                      <Link
                        href={`/admin/requests/${h.requestId}`}
                        className="text-xs text-red-700 hover:underline"
                      >
                        #{h.requestId}
                      </Link>
                    ) : null}
                    <Badge tone="neutral">{h.ruleVersion ?? "—"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={lang === "bn" ? "অডিট ইতিহাস" : "Audit history"} />
            <ActivityTimeline logs={logs} lang={lang} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={lang === "bn" ? "যাচাই" : "Verification"} />
            <dl>
              <DetailRow label={lang === "bn" ? "বর্তমান অবস্থা" : "Current status"}>
                <StatusBadge status={donor.verificationStatus} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "যাচাইকারী" : "Verified by"}>
                {verifier[0]?.name ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "যাচাইয়ের সময়" : "Verified at"}>
                {fmtDate(donor.verifiedAt, lang, true)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "নোট" : "Note"}>
                {donor.verificationNote ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "উপলব্ধতা" : "Availability"}>
                <StatusBadge status={donor.availabilityStatus} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ডিরেক্টরি" : "Searchable"}>
                <StatusBadge status={donor.searchable ? "ACTIVE" : "NOT_AVAILABLE"} />
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={lang === "bn" ? "যোগ্যতা (অপারেশনাল)" : "Eligibility (operational)"}
              subtitle={
                eligibility.ruleVersion
                  ? `${lang === "bn" ? "নিয়ম সংস্করণ" : "Rule version"} ${eligibility.ruleVersion}`
                  : undefined
              }
            />
            <div className="space-y-3 px-5 py-4">
              <div>
                {eligibility.eligible ? (
                  <Badge tone="success">
                    {lang === "bn" ? "নিয়ম অনুযায়ী যোগ্য" : "Meets configured rules"}
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    {lang === "bn"
                      ? "নিয়ম অনুযায়ী এখন যোগ্য নয়"
                      : "Does not currently meet rules"}
                  </Badge>
                )}
              </div>
              {eligibility.reasons.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {eligibility.reasons.map((r, i) => (
                    <li key={i}>{lang === "bn" ? r.bn : r.en}</li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-slate-500">
                {lang === "bn" ? "পরবর্তী সম্ভাব্য তারিখ" : "Next possible date"}:{" "}
                <span className="font-medium text-slate-800">
                  {fmtDate(eligibility.nextPossibleDate, lang)}
                </span>
              </p>
              <Disclaimer>
                {lang === "bn"
                  ? "এটি কেবলমাত্র কনফিগারযোগ্য অপারেশনাল নিয়মের ফলাফল, কোনো চিকিৎসা নির্ণয় নয়। চূড়ান্ত যোগ্যতা অবশ্যই অনুমোদিত রক্ত সংগ্রহ কেন্দ্র বা যোগ্য চিকিৎসকের দ্বারা নিশ্চিত করতে হবে।"
                  : "This is the result of configurable operational rules only and is not a medical diagnosis. Final clinical eligibility must be confirmed by a qualified blood collection centre or medical professional."}
              </Disclaimer>
            </div>
          </Card>

          {canSeeHealth ? (
            <Card>
              <CardHeader
                title={lang === "bn" ? "গোপনীয় স্বাস্থ্য নোট" : "Private health notes"}
                subtitle={
                  lang === "bn"
                    ? "শুধুমাত্র অনুমোদিত রোলের জন্য"
                    : "Restricted to authorised roles"
                }
              />
              <p className="px-5 py-4 text-sm text-slate-700">
                {donor.healthNotesPrivate ?? (lang === "bn" ? "কোনো নোট নেই" : "No notes")}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
