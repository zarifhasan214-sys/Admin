import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { locations } from "@/db/schema";
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
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage("view:dashboard");
  const lang = await getLang();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q");
  const type = get("type");
  const active = get("active");

  const parent = alias(locations, "parent");

  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(ilike(locations.nameBn, like), ilike(locations.nameEn, like));
    if (term) filters.push(term);
  }
  if (type) filters.push(eq(locations.type, type as "UNION"));
  if (active) filters.push(eq(locations.isActive, active === "yes"));

  const [rows, parents] = await Promise.all([
    db
      .select({ location: locations, parentName: parent.nameEn })
      .from(locations)
      .leftJoin(parent, eq(parent.id, locations.parentId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(locations.type), asc(locations.nameEn)),
    db
      .select({ id: locations.id, nameEn: locations.nameEn, type: locations.type })
      .from(locations)
      .orderBy(asc(locations.type)),
  ]);

  const canManage = can(actor.role, "manage:locations");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "লোকেশন ব্যবস্থাপনা" : "Location management"}
        subtitle={
          lang === "bn"
            ? "জেলা, উপজেলা ও ইউনিয়নের অফিসিয়াল তালিকা"
            : "Official district, upazila and union dataset"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "লোকেশন" : "Locations" },
        ]}
      />

      <div className="mb-4">
        <Disclaimer>
          {lang === "bn"
            ? "কাল্পনিক লোকেশন যোগ করবেন না। প্রতিটি এন্ট্রির জন্য সরকারি উৎস লিংক আবশ্যক; বিদ্যমান মনিরামপুর ডেটাসেট অপরিবর্তিত রাখুন।"
            : "Do not create fictional locations. Every entry requires an official source URL; keep the existing Manirampur dataset intact."}
        </Disclaimer>
      </div>

      <FilterBar
        lang={lang}
        searchPlaceholder={lang === "bn" ? "লোকেশনের নাম…" : "Location name…"}
        fields={[
          {
            type: "select",
            name: "type",
            label: lang === "bn" ? "ধরন" : "Type",
            options: ["DISTRICT", "UPAZILA", "UNION"].map((t) => ({
              value: t,
              label: t,
            })),
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
          <CardHeader title={lang === "bn" ? "নতুন লোকেশন" : "Add location"} />
          <RecordForm
            lang={lang}
            endpoint="/api/admin/locations"
            submitLabel={lang === "bn" ? "সংরক্ষণ" : "Save location"}
            fields={[
              {
                name: "type",
                label: lang === "bn" ? "ধরন" : "Type",
                type: "select",
                required: true,
                options: ["DISTRICT", "UPAZILA", "UNION"].map((t) => ({
                  value: t,
                  label: t,
                })),
              },
              {
                name: "parentId",
                label: lang === "bn" ? "প্যারেন্ট" : "Parent",
                type: "select",
                options: parents.map((p) => ({
                  value: String(p.id),
                  label: `${p.type} · ${p.nameEn}`,
                })),
              },
              { name: "nameBn", label: lang === "bn" ? "বাংলা নাম" : "Bangla name", required: true },
              { name: "nameEn", label: lang === "bn" ? "ইংরেজি নাম" : "English name", required: true },
              {
                name: "sourceUrl",
                label: lang === "bn" ? "উৎস লিংক" : "Source URL",
                type: "url",
                required: true,
                placeholder: "https://",
              },
            ]}
          />
        </Card>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="⌖"
            title={lang === "bn" ? "কোনো লোকেশন পাওয়া যায়নি" : "No locations found"}
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "ধরন" : "Type"}</Th>
                <Th>{lang === "bn" ? "বাংলা নাম" : "Bangla name"}</Th>
                <Th>{lang === "bn" ? "ইংরেজি নাম" : "English name"}</Th>
                <Th>{lang === "bn" ? "প্যারেন্ট" : "Parent"}</Th>
                <Th>{lang === "bn" ? "উৎস" : "Source"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "State"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ location: l, parentName }) => (
                <tr key={l.id} className="hover:bg-slate-50/70">
                  <Td className="text-slate-600">{l.type}</Td>
                  <Td className="font-medium text-slate-900">{l.nameBn}</Td>
                  <Td className="text-slate-700">{l.nameEn}</Td>
                  <Td className="text-slate-600">{parentName ?? "—"}</Td>
                  <Td>
                    {l.sourceUrl ? (
                      <a
                        href={l.sourceUrl}
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
                  <Td>
                    <StatusBadge status={l.isActive ? "ACTIVE" : "DEACTIVATED"} />
                  </Td>
                  <Td>
                    {canManage ? (
                      <ActionButton
                        lang={lang}
                        method="PATCH"
                        endpoint={`/api/admin/locations/${l.id}`}
                        payload={{ isActive: !l.isActive }}
                        tone={l.isActive ? "neutral" : "success"}
                        label={
                          l.isActive
                            ? lang === "bn"
                              ? "নিষ্ক্রিয়"
                              : "Deactivate"
                            : lang === "bn"
                              ? "সক্রিয়"
                              : "Activate"
                        }
                        confirmTitle={
                          lang === "bn" ? "অবস্থা পরিবর্তন করবেন?" : "Change state?"
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
