import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, notifications, users } from "@/db/schema";
import { NotificationComposer } from "@/components/admin/notification-composer";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const actor = await requireAdminPage("view:dashboard");
  const lang = await getLang();

  const [[totals], broadcasts, unions] = await Promise.all([
    db
      .select({
        total: count(),
        unread: sql<number>`count(*) filter (where ${notifications.isRead} = false)::int`,
        announcements: sql<number>`count(*) filter (where ${notifications.type} = 'ANNOUNCEMENT')::int`,
      })
      .from(notifications),
    db
      .select({
        broadcastId: notifications.broadcastId,
        titleBn: sql<string>`min(${notifications.titleBn})`,
        titleEn: sql<string>`min(${notifications.titleEn})`,
        type: sql<string>`min(${notifications.type})`,
        recipients: count(),
        sentAt: sql<string>`max(${notifications.createdAt})`,
        createdBy: sql<number>`min(${notifications.createdBy})`,
      })
      .from(notifications)
      .where(isNotNull(notifications.broadcastId))
      .groupBy(notifications.broadcastId)
      .orderBy(desc(sql`max(${notifications.createdAt})`))
      .limit(20),
    db
      .selectDistinct({ name: donorProfiles.unionName })
      .from(donorProfiles)
      .where(sql`${donorProfiles.unionName} is not null`)
      .orderBy(donorProfiles.unionName),
  ]);

  const recent = await db
    .select({
      id: notifications.id,
      titleBn: notifications.titleBn,
      titleEn: notifications.titleEn,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      userName: users.name,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(10);

  const canSend = can(actor.role, "manage:notifications");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "নোটিফিকেশন ব্যবস্থাপনা" : "Notification management"}
        subtitle={
          lang === "bn"
            ? "ঘোষণা পাঠান এবং বিতরণ পর্যবেক্ষণ করুন"
            : "Send announcements and monitor delivery"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "নোটিফিকেশন" : "Notifications" },
        ]}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          lang={lang}
          label={lang === "bn" ? "মোট নোটিফিকেশন" : "Total notifications"}
          value={totals?.total ?? 0}
          icon="🔔"
        />
        <StatCard
          lang={lang}
          label={lang === "bn" ? "অপঠিত" : "Unread"}
          value={totals?.unread ?? 0}
          icon="●"
          tone="warning"
        />
        <StatCard
          lang={lang}
          label={lang === "bn" ? "ঘোষণা" : "Announcements"}
          value={totals?.announcements ?? 0}
          icon="📣"
          tone="info"
        />
      </div>

      {canSend ? (
        <Card className="mb-4">
          <CardHeader
            title={lang === "bn" ? "ঘোষণা পাঠান" : "Send an announcement"}
            subtitle={
              lang === "bn"
                ? "পাঠানোর আগে প্রাপকের সংখ্যা দেখানো হবে এবং নিশ্চিতকরণ প্রয়োজন"
                : "Recipient count is shown and confirmation is required before sending"
            }
          />
          <NotificationComposer
            lang={lang}
            unions={unions.map((u) => u.name).filter((u): u is string => Boolean(u))}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={lang === "bn" ? "সাম্প্রতিক ব্রডকাস্ট" : "Recent broadcasts"} />
          {broadcasts.length === 0 ? (
            <EmptyState
              icon="📣"
              title={lang === "bn" ? "কোনো ব্রডকাস্ট নেই" : "No broadcasts yet"}
            />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "শিরোনাম" : "Title"}</Th>
                  <Th>{lang === "bn" ? "ধরন" : "Type"}</Th>
                  <Th>{lang === "bn" ? "প্রাপক" : "Recipients"}</Th>
                  <Th>{lang === "bn" ? "সময়" : "Sent"}</Th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => (
                  <tr key={b.broadcastId}>
                    <Td className="text-slate-800">
                      {lang === "bn" ? b.titleBn : b.titleEn}
                    </Td>
                    <Td className="text-slate-600">{b.type}</Td>
                    <Td className="tabular-nums text-slate-700">{b.recipients}</Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(b.sentAt, lang, true)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>

        <Card>
          <CardHeader title={lang === "bn" ? "সাম্প্রতিক নোটিফিকেশন" : "Recent notifications"} />
          {recent.length === 0 ? (
            <EmptyState
              icon="🔔"
              title={lang === "bn" ? "কোনো নোটিফিকেশন নেই" : "No notifications"}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((n) => (
                <li key={n.id} className="px-5 py-2.5">
                  <p className="truncate text-sm text-slate-800">
                    {lang === "bn" ? n.titleBn : n.titleEn}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {n.userName} · {fmtDate(n.createdAt, lang, true)} ·{" "}
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
  );
}
