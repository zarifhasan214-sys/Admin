import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import {
  Card,
  EmptyState,
  PageHeader,
  RoleBadge,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

export default async function SuspendedAccountsPage() {
  const actor = await requireAdminPage("view:users");
  const lang = await getLang();
  const admins = alias(users, "changed_by_user");

  const rows = await db
    .select({
      user: users,
      changedBy: admins.name,
    })
    .from(users)
    .leftJoin(admins, eq(admins.id, users.statusChangedBy))
    .where(inArray(users.status, ["SUSPENDED", "DEACTIVATED", "DELETION_REQUESTED"]))
    .orderBy(desc(users.statusChangedAt))
    .limit(100);

  const canModerate = can(actor.role, "moderate:accounts");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "স্থগিত ও নিষ্ক্রিয় অ্যাকাউন্ট" : "Suspended & inactive accounts"}
        subtitle={
          lang === "bn"
            ? "মডারেশন সিদ্ধান্ত ও পুনরুদ্ধার"
            : "Moderation decisions and account restoration"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "স্থগিত অ্যাকাউন্ট" : "Suspended accounts" },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="✅"
            title={
              lang === "bn"
                ? "কোনো স্থগিত অ্যাকাউন্ট নেই"
                : "No suspended accounts"
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "ব্যবহারকারী" : "User"}</Th>
                <Th>{lang === "bn" ? "রোল" : "Role"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "State"}</Th>
                <Th>{lang === "bn" ? "কারণ" : "Reason"}</Th>
                <Th>{lang === "bn" ? "তারিখ" : "Date"}</Th>
                <Th>{lang === "bn" ? "অ্যাডমিন" : "Admin"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, changedBy }) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <Td>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {user.name}
                    </Link>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                  </Td>
                  <Td>
                    <RoleBadge role={user.role} />
                  </Td>
                  <Td>
                    <StatusBadge status={user.status} />
                  </Td>
                  <Td className="max-w-xs text-slate-600">
                    {user.statusReason ?? "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(user.statusChangedAt, lang, true)}
                  </Td>
                  <Td className="text-slate-600">{changedBy ?? "—"}</Td>
                  <Td>
                    {canModerate ? (
                      <ActionButton
                        lang={lang}
                        tone="success"
                        endpoint={`/api/admin/users/${user.id}/status`}
                        payload={{ status: "ACTIVE" }}
                        label={lang === "bn" ? "পুনরুদ্ধার" : "Restore"}
                        confirmTitle={
                          lang === "bn"
                            ? "অ্যাকাউন্ট পুনরুদ্ধার করবেন?"
                            : "Restore this account?"
                        }
                        confirmBody={
                          lang === "bn"
                            ? "ব্যবহারকারী আবার প্ল্যাটফর্মে প্রবেশ করতে পারবেন।"
                            : "The user will regain access to the platform."
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        {lang === "bn" ? "অনুমতি নেই" : "No permission"}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
