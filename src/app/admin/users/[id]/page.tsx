import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, or, and } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  bloodRequests,
  donorProfiles,
  notifications,
  users,
} from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { ActivityTimeline } from "@/components/admin/activity";
import { RoleChanger } from "@/components/admin/role-changer";
import {
  BloodGroupTag,
  Card,
  CardHeader,
  DetailRow,
  EmptyState,
  PageHeader,
  RoleBadge,
  StatusBadge,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdminPage("view:users");
  const lang = await getLang();
  const userId = (await params).id;
  if (!Number.isInteger(userId)) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) notFound();

  const [donor] = await db
    .select()
    .from(donorProfiles)
    .where(eq(donorProfiles.userId, userId))
    .limit(1);

  const [requests, notes, logs] = await Promise.all([
    db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.requesterId, userId))
      .orderBy(desc(bloodRequests.createdAt))
      .limit(10),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(6),
    db
      .select()
      .from(auditLogs)
      .where(
        or(
          and(
            eq(auditLogs.resourceType, "USER"),
            eq(auditLogs.resourceId, String(userId)),
          ),
          eq(auditLogs.actorId, userId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(12),
  ]);

  const canModerate = can(actor.role, "moderate:accounts");
  const canRole = can(actor.role, "manage:admins");

  return (
    <div>
      <PageHeader
        title={user.name}
        subtitle={user.email}
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "ব্যবহারকারী" : "Users", href: "/admin/users" },
          { label: `#${user.id}` },
        ]}
        actions={
          canModerate ? (
            <>
              {user.status !== "ACTIVE" ? (
                <ActionButton
                  lang={lang}
                  endpoint={`/api/admin/users/${user.id}/status`}
                  payload={{ status: "ACTIVE" }}
                  label={lang === "bn" ? "পুনরায় সক্রিয়" : "Reactivate"}
                  tone="success"
                  size="md"
                  confirmTitle={
                    lang === "bn" ? "অ্যাকাউন্ট সক্রিয় করবেন?" : "Reactivate account?"
                  }
                  confirmBody={
                    lang === "bn"
                      ? "ব্যবহারকারী আবার প্ল্যাটফর্ম ব্যবহার করতে পারবেন।"
                      : "The user will regain access to the platform."
                  }
                />
              ) : null}
              {user.status !== "SUSPENDED" ? (
                <ActionButton
                  lang={lang}
                  endpoint={`/api/admin/users/${user.id}/status`}
                  payload={{ status: "SUSPENDED" }}
                  label={lang === "bn" ? "স্থগিত করুন" : "Suspend"}
                  tone="danger"
                  size="md"
                  requireNote
                  confirmTitle={
                    lang === "bn" ? "অ্যাকাউন্ট স্থগিত করবেন?" : "Suspend account?"
                  }
                  confirmBody={
                    lang === "bn"
                      ? "এই অ্যাকাউন্ট আর লগইন করতে পারবে না। কারণ অডিট লগে সংরক্ষিত হবে।"
                      : "This account will no longer be able to sign in. The reason is stored in the audit log."
                  }
                />
              ) : null}
              {user.status !== "DEACTIVATED" ? (
                <ActionButton
                  lang={lang}
                  endpoint={`/api/admin/users/${user.id}/status`}
                  payload={{ status: "DEACTIVATED" }}
                  label={lang === "bn" ? "নিষ্ক্রিয় করুন" : "Deactivate"}
                  tone="neutral"
                  size="md"
                  requireNote
                  confirmTitle={
                    lang === "bn" ? "অ্যাকাউন্ট নিষ্ক্রিয় করবেন?" : "Deactivate account?"
                  }
                />
              ) : null}
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={lang === "bn" ? "অ্যাকাউন্ট তথ্য" : "Account information"} />
            <dl>
              <DetailRow label={lang === "bn" ? "রোল" : "Role"}>
                <RoleBadge role={user.role} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "স্ট্যাটাস" : "Status"}>
                <StatusBadge status={user.status} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ইমেইল যাচাই" : "Email verified"}>
                <StatusBadge status={user.emailVerified ? "VERIFIED" : "UNVERIFIED"} />
              </DetailRow>
              <DetailRow label={lang === "bn" ? "ফোন" : "Phone"}>
                {user.phone ?? "—"}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "নিবন্ধন" : "Registered"}>
                {fmtDate(user.createdAt, lang, true)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "সর্বশেষ লগইন" : "Last login"}>
                {fmtDate(user.lastLoginAt, lang, true)}
              </DetailRow>
              <DetailRow label={lang === "bn" ? "স্ট্যাটাস কারণ" : "Status reason"}>
                {user.statusReason ?? "—"}
              </DetailRow>
              {canRole ? (
                <DetailRow label={lang === "bn" ? "রোল পরিবর্তন" : "Change role"}>
                  <RoleChanger userId={user.id} currentRole={user.role} lang={lang} />
                </DetailRow>
              ) : null}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={lang === "bn" ? "রক্তের অনুরোধ" : "Blood requests"}
              subtitle={
                lang === "bn"
                  ? "এই ব্যবহারকারীর সাম্প্রতিক অনুরোধ"
                  : "Recent requests submitted by this user"
              }
            />
            {requests.length === 0 ? (
              <EmptyState
                icon="⛑"
                title={lang === "bn" ? "কোনো অনুরোধ নেই" : "No requests"}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <BloodGroupTag group={r.bloodGroup} />
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:underline"
                    >
                      {r.patientName} · {r.hospitalName}
                    </Link>
                    <StatusBadge status={r.status} />
                    <span className="text-[11px] text-slate-400">
                      {fmtDate(r.createdAt, lang)}
                    </span>
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
            <CardHeader title={lang === "bn" ? "ডোনার প্রোফাইল" : "Donor profile"} />
            {donor ? (
              <dl>
                <DetailRow label={lang === "bn" ? "রক্তের গ্রুপ" : "Blood group"}>
                  <BloodGroupTag group={donor.bloodGroup} />
                </DetailRow>
                <DetailRow label={lang === "bn" ? "যাচাই" : "Verification"}>
                  <StatusBadge status={donor.verificationStatus} />
                </DetailRow>
                <DetailRow label={lang === "bn" ? "উপলব্ধতা" : "Availability"}>
                  <StatusBadge status={donor.availability} />
                </DetailRow>
                <DetailRow label={lang === "bn" ? "রক্তদান সংখ্যা" : "Donations"}>
                  {donor.donationCount}
                </DetailRow>
                <DetailRow label={lang === "bn" ? "প্রোফাইল" : "Open profile"}>
                  <Link
                    href={`/admin/donors/${donor.id}`}
                    className="text-sm font-medium text-red-700 hover:underline"
                  >
                    {lang === "bn" ? "ডোনার বিস্তারিত" : "Donor details"}
                  </Link>
                </DetailRow>
              </dl>
            ) : (
              <EmptyState
                icon="♥"
                title={
                  lang === "bn" ? "ডোনার প্রোফাইল নেই" : "No donor profile"
                }
              />
            )}
          </Card>

          <Card>
            <CardHeader title={lang === "bn" ? "নোটিফিকেশন" : "Notifications"} />
            {notes.length === 0 ? (
              <EmptyState
                icon="🔔"
                title={lang === "bn" ? "কোনো নোটিফিকেশন নেই" : "No notifications"}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notes.map((n) => (
                  <li key={n.id} className="px-5 py-2.5">
                    <p className="truncate text-sm text-slate-800">
                      {lang === "bn" ? n.titleBn : n.titleEn}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {fmtDate(n.createdAt, lang, true)} ·{" "}
                      {n.isRead
                        ? lang === "bn"
                          ? "পঠিত"
                          : "Read"
                        : lang === "bn"
                          ? "অপঠিত"
                          : "Unread"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
