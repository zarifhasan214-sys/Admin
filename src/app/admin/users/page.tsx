import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  RoleBadge,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:users");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = get("q");
  const status = get("status");
  const role = get("role");
  const verified = get("verified");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(users.name, like),
      ilike(users.email, like),
      ilike(users.phone, like),
    );
    if (term) filters.push(term);
  }
  if (status) filters.push(eq(users.status, status as "ACTIVE"));
  if (role) filters.push(eq(users.role, role as "USER"));
  if (verified) filters.push(eq(users.emailVerified, verified === "yes"));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(users).where(where),
  ]);

  const query: Record<string, string | undefined> = { q, status, role, verified };

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "ব্যবহারকারী ব্যবস্থাপনা" : "User management"}
        subtitle={
          lang === "bn"
            ? "সব নিবন্ধিত অ্যাকাউন্ট, স্ট্যাটাস ও রোল"
            : "All registered accounts, statuses and roles"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "ব্যবহারকারী" : "Users" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={
          lang === "bn" ? "নাম, ইমেইল বা ফোন…" : "Name, email or phone…"
        }
        exportHref={`/api/admin/export/users?${new URLSearchParams(
          Object.entries(query).filter(([, v]) => v) as [string, string][],
        ).toString()}`}
        fields={[
          {
            type: "select",
            name: "status",
            label: lang === "bn" ? "স্ট্যাটাস" : "Status",
            options: [
              "ACTIVE",
              "SUSPENDED",
              "DEACTIVATED",
              "DELETION_REQUESTED",
            ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
          },
          {
            type: "select",
            name: "role",
            label: lang === "bn" ? "রোল" : "Role",
            options: ["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].map(
              (v) => ({ value: v, label: v.replaceAll("_", " ") }),
            ),
          },
          {
            type: "select",
            name: "verified",
            label: lang === "bn" ? "ইমেইল যাচাই" : "Email verified",
            options: [
              { value: "yes", label: lang === "bn" ? "যাচাইকৃত" : "Verified" },
              { value: "no", label: lang === "bn" ? "যাচাই হয়নি" : "Unverified" },
            ],
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="👤"
            title={lang === "bn" ? "কোনো ব্যবহারকারী পাওয়া যায়নি" : "No users found"}
            description={
              lang === "bn"
                ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।"
                : "Try changing the filters."
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "নাম" : "Name"}</Th>
                  <Th>{lang === "bn" ? "যোগাযোগ" : "Contact"}</Th>
                  <Th>{lang === "bn" ? "রোল" : "Role"}</Th>
                  <Th>{lang === "bn" ? "স্ট্যাটাস" : "Status"}</Th>
                  <Th>{lang === "bn" ? "ইমেইল যাচাই" : "Email"}</Th>
                  <Th>{lang === "bn" ? "নিবন্ধন" : "Registered"}</Th>
                  <Th>{lang === "bn" ? "সর্বশেষ লগইন" : "Last login"}</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {u.name}
                      </Link>
                      <div className="text-[11px] text-slate-400">#{u.id}</div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">{u.email}</div>
                      <div className="text-[11px] text-slate-400">
                        {u.phone ?? "—"}
                      </div>
                    </Td>
                    <Td>
                      <RoleBadge role={u.role} />
                    </Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td>
                      <StatusBadge status={u.emailVerified ? "VERIFIED" : "UNVERIFIED"} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(u.createdAt, lang)}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(u.lastLoginAt, lang, true)}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {lang === "bn" ? "বিস্তারিত" : "Details"}
                      </Link>
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
