import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { RoleChanger } from "@/components/admin/role-changer";
import {
  Card,
  CardHeader,
  Disclaimer,
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

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const actor = await requireAdminPage("manage:admins");
  const lang = await getLang();

  const admins = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"]))
    .orderBy(desc(users.role), desc(users.createdAt));

  const superAdmins = admins.filter((a) => a.role === "SUPER_ADMIN").length;

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "অ্যাডমিন ও রোল" : "Admins & roles"}
        subtitle={
          lang === "bn"
            ? "শুধুমাত্র SUPER_ADMIN রোল পরিবর্তন করতে পারেন"
            : "Only a SUPER_ADMIN can change administrator roles"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "অ্যাডমিন" : "Admins" },
        ]}
      />

      <div className="mb-4">
        <Disclaimer>
          {lang === "bn"
            ? `শেষ SUPER_ADMIN সরানো যাবে না (বর্তমানে ${superAdmins} জন)। নিজের রোল নিজে পরিবর্তন করা যাবে না। প্রতিটি পরিবর্তন অডিট লগে সংরক্ষিত হয়।`
            : `The last SUPER_ADMIN cannot be removed (currently ${superAdmins}). You cannot change your own role. Every change is recorded in the audit log.`}
        </Disclaimer>
      </div>

      <Card>
        <CardHeader title={lang === "bn" ? "প্রশাসক তালিকা" : "Administrator accounts"} />
        {admins.length === 0 ? (
          <EmptyState icon="⚿" title={lang === "bn" ? "কোনো অ্যাডমিন নেই" : "No administrators"} />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "নাম" : "Name"}</Th>
                <Th>{lang === "bn" ? "রোল" : "Role"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "Status"}</Th>
                <Th>{lang === "bn" ? "ইমেইল" : "Email verified"}</Th>
                <Th>{lang === "bn" ? "সর্বশেষ লগইন" : "Last login"}</Th>
                <Th>{lang === "bn" ? "তৈরি" : "Created"}</Th>
                <Th>{lang === "bn" ? "রোল পরিবর্তন" : "Change role"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <Td>
                    <Link
                      href={`/admin/users/${a.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {a.name}
                    </Link>
                    <div className="text-[11px] text-slate-400">{a.email}</div>
                  </Td>
                  <Td>
                    <RoleBadge role={a.role} />
                  </Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td>
                    <StatusBadge status={a.emailVerified ? "VERIFIED" : "UNVERIFIED"} />
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(a.lastLoginAt, lang, true)}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(a.createdAt, lang)}
                  </Td>
                  <Td>
                    {a.id === actor.id ? (
                      <span className="text-xs text-slate-400">
                        {lang === "bn" ? "নিজের অ্যাকাউন্ট" : "Your account"}
                      </span>
                    ) : (
                      <RoleChanger userId={a.id} currentRole={a.role} lang={lang} />
                    )}
                  </Td>
                  <Td>
                    {a.id === actor.id ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : a.status === "ACTIVE" ? (
                      <ActionButton
                        lang={lang}
                        tone="danger"
                        requireNote
                        endpoint={`/api/admin/users/${a.id}/status`}
                        payload={{ status: "SUSPENDED" }}
                        label={lang === "bn" ? "স্থগিত" : "Suspend"}
                        confirmTitle={
                          lang === "bn"
                            ? "অ্যাডমিন অ্যাকাউন্ট স্থগিত করবেন?"
                            : "Suspend this administrator?"
                        }
                      />
                    ) : (
                      <ActionButton
                        lang={lang}
                        tone="success"
                        endpoint={`/api/admin/users/${a.id}/status`}
                        payload={{ status: "ACTIVE" }}
                        label={lang === "bn" ? "সক্রিয়" : "Reactivate"}
                        confirmTitle={
                          lang === "bn" ? "পুনরায় সক্রিয় করবেন?" : "Reactivate account?"
                        }
                      />
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
