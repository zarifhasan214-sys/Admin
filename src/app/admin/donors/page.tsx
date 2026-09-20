import Link from "next/link";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  BloodGroupTag,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getActiveRule } from "@/lib/eligibility";

const PAGE_SIZE = 20;
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const dynamic = "force-dynamic";

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("view:donors");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = get("q");
  const group = get("group");
  const availability = get("availability");
  const verification = get("verification");
  const union = get("union");
  const gender = get("gender");
  const searchable = get("searchable");
  const page = Math.max(1, Number(get("page")) || 1);

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(users.name, like),
      ilike(users.email, like),
      ilike(donorProfiles.phoneNumber, like),
      ilike(donorProfiles.unionName, like),
      ilike(donorProfiles.area, like),
    );
    if (term) filters.push(term);
  }
  if (group) filters.push(eq(donorProfiles.bloodGroup, group as "A+"));
  if (availability)
    filters.push(eq(donorProfiles.availabilityStatus, availability as "AVAILABLE"));
  if (verification)
    filters.push(
      eq(donorProfiles.verificationStatus, verification as "VERIFIED"),
    );
  if (union) filters.push(eq(donorProfiles.unionName, union));
  if (gender) filters.push(eq(donorProfiles.gender, gender as "MALE"));
  if (searchable)
    filters.push(eq(donorProfiles.searchable, searchable === "yes"));
  const where = filters.length ? and(...filters) : undefined;

  const rule = await getActiveRule();
  const interval = rule?.defaultDonationIntervalDays ?? 120;

  const [rows, [totalRow], unions] = await Promise.all([
    db
      .select({
        id: donorProfiles.id,
        name: users.name,
        userId: users.id,
        bloodGroup: donorProfiles.bloodGroup,
        gender: donorProfiles.gender,
        dateOfBirth: donorProfiles.dateOfBirth,
        phone: donorProfiles.phoneNumber,
        district: donorProfiles.district,
        upazila: donorProfiles.upazila,
        unionName: donorProfiles.unionName,
        availability: donorProfiles.availabilityStatus,
        verificationStatus: donorProfiles.verificationStatus,
        donationCount: donorProfiles.donationCount,
        lastDonationDate: donorProfiles.lastDonationDate,
        profileCompletion: donorProfiles.profileCompletion,
        isSearchable: donorProfiles.searchable,
      })
      .from(donorProfiles)
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(where)
      .orderBy(desc(donorProfiles.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ value: count() })
      .from(donorProfiles)
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(where),
    db
      .selectDistinct({ name: donorProfiles.unionName })
      .from(donorProfiles)
      .where(sql`${donorProfiles.unionName} is not null`)
      .orderBy(donorProfiles.unionName),
  ]);

  const query: Record<string, string | undefined> = {
    q,
    group,
    availability,
    verification,
    union,
    gender,
    searchable,
  };

  function ageOf(dob: string | null) {
    if (!dob) return "—";
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000));
  }

  function nextDonation(last: string | null) {
    if (!last) return "—";
    const d = new Date(last);
    d.setDate(d.getDate() + interval);
    return fmtDate(d, lang);
  }

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "রক্তদাতা ব্যবস্থাপনা" : "Donor management"}
        subtitle={
          lang === "bn"
            ? "ডোনার ডিরেক্টরি, যাচাই ও উপলব্ধতা"
            : "Donor directory, verification and availability"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "রক্তদাতা" : "Donors" },
        ]}
      />

      <FilterBar
        lang={lang}
        searchPlaceholder={
          lang === "bn" ? "নাম, ফোন, ইমেইল, এলাকা…" : "Name, phone, email, area…"
        }
        exportHref={`/api/admin/export/donors?${new URLSearchParams(
          Object.entries(query).filter(([, v]) => v) as [string, string][],
        ).toString()}`}
        fields={[
          {
            type: "select",
            name: "group",
            label: lang === "bn" ? "রক্তের গ্রুপ" : "Blood group",
            options: GROUPS.map((g) => ({ value: g, label: g })),
          },
          {
            type: "select",
            name: "verification",
            label: lang === "bn" ? "যাচাই" : "Verification",
            options: [
              "UNVERIFIED",
              "PENDING_REVIEW",
              "VERIFIED",
              "REJECTED",
              "SUSPENDED",
            ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
          },
          {
            type: "select",
            name: "availability",
            label: lang === "bn" ? "উপলব্ধতা" : "Availability",
            options: [
              "AVAILABLE",
              "TEMPORARILY_UNAVAILABLE",
              "NOT_AVAILABLE",
            ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
          },
          {
            type: "select",
            name: "union",
            label: lang === "bn" ? "ইউনিয়ন" : "Union",
            options: unions
              .filter((u) => u.name)
              .map((u) => ({ value: u.name as string, label: u.name as string })),
          },
          {
            type: "select",
            name: "gender",
            label: lang === "bn" ? "লিঙ্গ" : "Gender",
            options: ["MALE", "FEMALE", "OTHER"].map((v) => ({
              value: v,
              label: v,
            })),
          },
          {
            type: "select",
            name: "searchable",
            label: lang === "bn" ? "ডিরেক্টরি" : "Searchable",
            options: [
              { value: "yes", label: lang === "bn" ? "হ্যাঁ" : "Yes" },
              { value: "no", label: lang === "bn" ? "না" : "No" },
            ],
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="♥"
            title={lang === "bn" ? "কোনো donor পাওয়া যায়নি" : "No donors found"}
            description={
              lang === "bn"
                ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।"
                : "Try adjusting the filters."
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>{lang === "bn" ? "নাম" : "Name"}</Th>
                  <Th>{lang === "bn" ? "গ্রুপ" : "Group"}</Th>
                  <Th>{lang === "bn" ? "লিঙ্গ / বয়স" : "Gender / age"}</Th>
                  <Th>{lang === "bn" ? "ফোন" : "Phone"}</Th>
                  <Th>{lang === "bn" ? "অবস্থান" : "Location"}</Th>
                  <Th>{lang === "bn" ? "উপলব্ধতা" : "Availability"}</Th>
                  <Th>{lang === "bn" ? "যাচাই" : "Verification"}</Th>
                  <Th>{lang === "bn" ? "রক্তদান" : "Donations"}</Th>
                  <Th>{lang === "bn" ? "সর্বশেষ" : "Last"}</Th>
                  <Th>{lang === "bn" ? "পরবর্তী সম্ভাব্য" : "Next possible"}</Th>
                  <Th>{lang === "bn" ? "প্রোফাইল" : "Profile"}</Th>
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
                      <div className="text-[11px] text-slate-400">
                        {d.isSearchable
                          ? lang === "bn"
                            ? "ডিরেক্টরিতে আছে"
                            : "In directory"
                          : lang === "bn"
                            ? "ডিরেক্টরিতে নেই"
                            : "Hidden"}
                      </div>
                    </Td>
                    <Td>
                      <BloodGroupTag group={d.bloodGroup} />
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {d.gender} · {ageOf(d.dateOfBirth)}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {d.phone ?? "—"}
                    </Td>
                    <Td className="text-slate-600">
                      <div>{d.unionName ?? "—"}</div>
                      <div className="text-[11px] text-slate-400">
                        {d.upazila}, {d.district}
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={d.availability} />
                    </Td>
                    <Td>
                      <StatusBadge status={d.verificationStatus} />
                    </Td>
                    <Td className="tabular-nums text-slate-700">
                      {d.donationCount}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {fmtDate(d.lastDonationDate, lang)}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">
                      {nextDonation(d.lastDonationDate)}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${d.profileCompletion}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {d.profileCompletion}%
                        </span>
                      </div>
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
