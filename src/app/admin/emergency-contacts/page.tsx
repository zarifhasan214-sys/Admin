import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { FilterBar } from "@/components/admin/filter-bar";
import { RecordForm } from "@/components/admin/record-form";
import {
  Card,
  CardHeader,
  Disclaimer,
  EmptyState,
  PageHeader,
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

const CATEGORIES = ["EMERGENCY", "HEALTHLINE", "HOSPITAL", "BLOOD_BANK", "AMBULANCE"];

export default async function EmergencyContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:dashboard");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const category = get("category");
  const active = get("active");

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(emergencyContacts.nameBn, like),
      ilike(emergencyContacts.nameEn, like),
      ilike(emergencyContacts.organization, like),
      ilike(emergencyContacts.phone, like),
    );
    if (term) filters.push(term);
  }
  if (category) filters.push(eq(emergencyContacts.category, category));
  if (active) filters.push(eq(emergencyContacts.isActive, active === "yes"));

  const rows = await db
    .select()
    .from(emergencyContacts)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(emergencyContacts.isActive), emergencyContacts.category);

  const canManage = can(actor.role, "manage:emergency_contacts");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "জরুরি যোগাযোগ" : "Emergency contacts"}
        subtitle={
          lang === "bn"
            ? "যাচাইকৃত উৎসসহ জরুরি নম্বরের তালিকা"
            : "Directory of emergency numbers with verified sources"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "জরুরি যোগাযোগ" : "Emergency contacts" },
        ]}
      />

      <div className="mb-4">
        <Disclaimer>
          {lang === "bn"
            ? "জরুরি যোগাযোগের তথ্য কখনো অনুমান করে যোগ করবেন না। প্রতিটি এন্ট্রির জন্য যাচাইযোগ্য উৎস লিংক ও যাচাইয়ের তারিখ বাধ্যতামূলক।"
            : "Never invent emergency contact information. Every entry requires a verifiable source URL and a verification date."}
        </Disclaimer>
      </div>

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "নাম, সংস্থা বা ফোন…" : "Name, organisation or phone…"}
        fields={[
          {
            type: "select",
            name: "category",
            label: lang === "bn" ? "ক্যাটাগরি" : "Category",
            options: CATEGORIES.map((c) => ({ value: c, label: c.replaceAll("_", " ") })),
          },
          {
            type: "select",
            name: "active",
            label: lang === "bn" ? "অবস্থা" : "State",
            options: [
              { value: "yes", label: lang === "bn" ? "সক্রিয়" : "Active" },
              { value: "no", label: lang === "bn" ? "নিষ্ক্রিয়" : "Inactive" },
            ],
          },
        ]}
      />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader
            title={lang === "bn" ? "নতুন যোগাযোগ যোগ করুন" : "Add a verified contact"}
            subtitle={
              lang === "bn"
                ? "উৎস লিংক ও যাচাইয়ের তারিখ আবশ্যক"
                : "Source URL and verification date are mandatory"
            }
          />
          <RecordForm
            lang={lang}
            endpoint="/api/admin/emergency-contacts"
            submitLabel={lang === "bn" ? "সংরক্ষণ" : "Save contact"}
            fields={[
              { name: "nameBn", label: lang === "bn" ? "বাংলা নাম" : "Bangla name", required: true },
              { name: "nameEn", label: lang === "bn" ? "ইংরেজি নাম" : "English name", required: true },
              { name: "organization", label: lang === "bn" ? "সংস্থা" : "Organisation" },
              { name: "phone", label: lang === "bn" ? "ফোন" : "Phone", required: true },
              { name: "alternatePhone", label: lang === "bn" ? "বিকল্প ফোন" : "Alternate phone" },
              {
                name: "category",
                label: lang === "bn" ? "ক্যাটাগরি" : "Category",
                type: "select",
                required: true,
                options: CATEGORIES.map((c) => ({ value: c, label: c })),
              },
              {
                name: "sourceUrl",
                label: lang === "bn" ? "উৎস লিংক" : "Source URL",
                type: "url",
                required: true,
                placeholder: "https://",
              },
              {
                name: "lastVerifiedAt",
                label: lang === "bn" ? "যাচাইয়ের তারিখ" : "Verified on",
                type: "date",
                required: true,
              },
              { name: "address", label: lang === "bn" ? "ঠিকানা" : "Address", type: "textarea" },
            ]}
          />
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="☎"
            title={lang === "bn" ? "কোনো যোগাযোগ পাওয়া যায়নি" : "No contacts found"}
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "নাম" : "Name"}</Th>
                <Th>{lang === "bn" ? "সংস্থা" : "Organisation"}</Th>
                <Th>{lang === "bn" ? "ফোন" : "Phone"}</Th>
                <Th>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</Th>
                <Th>{lang === "bn" ? "উৎস" : "Source"}</Th>
                <Th>{lang === "bn" ? "সর্বশেষ যাচাই" : "Last verified"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "State"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <Td>
                    <div className="font-medium text-slate-900">{c.nameBn}</div>
                    <div className="text-[11px] text-slate-400">{c.nameEn}</div>
                  </Td>
                  <Td className="text-slate-600">{c.organization ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-slate-800">
                    {c.phone}
                    {c.alternatePhone ? (
                      <div className="text-[11px] text-slate-400">{c.alternatePhone}</div>
                    ) : null}
                  </Td>
                  <Td className="text-slate-600">{c.category.replaceAll("_", " ")}</Td>
                  <Td className="max-w-40 truncate">
                    {c.sourceUrl ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-700 hover:underline"
                      >
                        {lang === "bn" ? "উৎস" : "Source"}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(c.lastVerifiedAt, lang)}
                  </Td>
                  <Td>
                    <StatusBadge status={c.isActive ? "ACTIVE" : "DEACTIVATED"} />
                  </Td>
                  <Td>
                    {canManage ? (
                      <ActionButton
                        lang={lang}
                        method="PATCH"
                        endpoint={`/api/admin/emergency-contacts/${c.id}`}
                        payload={{ isActive: !c.isActive }}
                        tone={c.isActive ? "neutral" : "success"}
                        label={
                          c.isActive
                            ? lang === "bn"
                              ? "নিষ্ক্রিয়"
                              : "Deactivate"
                            : lang === "bn"
                              ? "সক্রিয়"
                              : "Activate"
                        }
                        confirmTitle={
                          lang === "bn"
                            ? "অবস্থা পরিবর্তন করবেন?"
                            : "Change contact state?"
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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
