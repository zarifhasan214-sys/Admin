import Link from "next/link";
import { asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import {
  BloodGroupTag,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:donors");
  const lang = await getLang();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";

  const statuses = status
    ? [status as "PENDING_REVIEW"]
    : (["PENDING_REVIEW", "UNVERIFIED"] as const);

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: donorProfiles.id,
        name: users.name,
        email: users.email,
        bloodGroup: donorProfiles.bloodGroup,
        gender: donorProfiles.gender,
        unionName: donorProfiles.unionName,
        verificationStatus: donorProfiles.verificationStatus,
        profileCompletion: donorProfiles.profileCompletion,
        createdAt: donorProfiles.createdAt,
        updatedAt: donorProfiles.updatedAt,
      })
      .from(donorProfiles)
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(inArray(donorProfiles.verificationStatus, [...statuses]))
      .orderBy(
        sql`case when ${donorProfiles.verificationStatus} = 'PENDING_REVIEW' then 0 else 1 end`,
        asc(donorProfiles.createdAt),
      )
      .limit(50),
    db
      .select({ status: donorProfiles.verificationStatus, value: count() })
      .from(donorProfiles)
      .groupBy(donorProfiles.verificationStatus),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?.value ?? 0;
  const canModerate = can(actor.role, "moderate:donors");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "ডোনার যাচাই কিউ" : "Donor verification queue"}
        subtitle={
          lang === "bn"
            ? "অগ্রাধিকার অনুযায়ী সাজানো — পুরোনো আবেদন আগে"
            : "Sorted by priority — oldest submissions first"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "যাচাই কিউ" : "Verification queue" },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          ["PENDING_REVIEW", "UNVERIFIED", "VERIFIED", "REJECTED", "SUSPENDED"] as const
        ).map((s) => (
          <StatCard
            key={s}
            lang={lang}
            label={s.replaceAll("_", " ")}
            value={countOf(s)}
            icon={s === "VERIFIED" ? "✓" : s === "REJECTED" ? "✕" : "⏳"}
            tone={
              s === "VERIFIED"
                ? "success"
                : s === "REJECTED" || s === "SUSPENDED"
                  ? "critical"
                  : "warning"
            }
            href={`/admin/donors?verification=${s}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title={lang === "bn" ? "রিভিউয়ের অপেক্ষায়" : "Awaiting review"}
          subtitle={
            lang === "bn"
              ? "যাচাইয়ের আগে ডোনারের সম্পূর্ণ তথ্য দেখুন"
              : "Open a donor to review all information before verifying"
          }
        />
        {rows.length === 0 ? (
          <EmptyState
            icon="✅"
            title={
              lang === "bn"
                ? "এই মুহূর্তে কোনো pending verification নেই"
                : "No pending verifications right now"
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "ডোনার" : "Donor"}</Th>
                <Th>{lang === "bn" ? "গ্রুপ" : "Group"}</Th>
                <Th>{lang === "bn" ? "ইউনিয়ন" : "Union"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "Status"}</Th>
                <Th>{lang === "bn" ? "প্রোফাইল" : "Profile"}</Th>
                <Th>{lang === "bn" ? "জমা" : "Submitted"}</Th>
                <Th>{lang === "bn" ? "সর্বশেষ আপডেট" : "Updated"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70">
                  <Td>
                    <Link
                      href={`/admin/donors/${d.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {d.name}
                    </Link>
                    <div className="text-[11px] text-slate-400">{d.email}</div>
                  </Td>
                  <Td>
                    <BloodGroupTag group={d.bloodGroup} />
                  </Td>
                  <Td className="text-slate-600">{d.unionName ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={d.verificationStatus} />
                  </Td>
                  <Td className="text-slate-600">{d.profileCompletion}%</Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(d.createdAt, lang)}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(d.updatedAt, lang)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/admin/donors/${d.id}`}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {lang === "bn" ? "রিভিউ" : "Review"}
                      </Link>
                      {canModerate ? (
                        <>
                          <ActionButton
                            lang={lang}
                            tone="success"
                            endpoint={`/api/admin/donors/${d.id}/verification`}
                            payload={{ status: "VERIFIED" }}
                            label={lang === "bn" ? "যাচাই" : "Verify"}
                            confirmTitle={
                              lang === "bn"
                                ? "ডোনার যাচাই করবেন?"
                                : "Verify this donor?"
                            }
                            confirmBody={
                              lang === "bn"
                                ? "কাজটি অডিট লগে সংরক্ষিত হবে।"
                                : "This action is recorded in the audit log."
                            }
                          />
                          <ActionButton
                            lang={lang}
                            tone="danger"
                            requireNote
                            endpoint={`/api/admin/donors/${d.id}/verification`}
                            payload={{ status: "REJECTED" }}
                            label={lang === "bn" ? "প্রত্যাখ্যান" : "Reject"}
                            confirmTitle={
                              lang === "bn"
                                ? "যাচাই প্রত্যাখ্যান করবেন?"
                                : "Reject verification?"
                            }
                          />
                        </>
                      ) : null}
                    </div>
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
