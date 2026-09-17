import { desc } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules } from "@/db/schema";
import { ActionButton } from "@/components/admin/action-button";
import { JsonViewer } from "@/components/admin/json-viewer";
import { RecordForm } from "@/components/admin/record-form";
import {
  Badge,
  Card,
  CardHeader,
  Disclaimer,
  EmptyState,
  PageHeader,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function EligibilityRulesPage() {
  const actor = await requireAdminPage("view:dashboard");
  const lang = await getLang();

  const rules = await db
    .select()
    .from(eligibilityRules)
    .orderBy(desc(eligibilityRules.effectiveFrom), desc(eligibilityRules.id));

  const active = rules.find((r) => r.isActive) ?? null;
  const canManage = can(actor.role, "manage:eligibility");

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "যোগ্যতার নিয়ম" : "Eligibility rules"}
        subtitle={
          lang === "bn"
            ? "সংস্করণভিত্তিক অপারেশনাল নিয়ম — ইতিহাস কখনো মুছে ফেলা হয় না"
            : "Versioned operational rules — history is never overwritten"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "যোগ্যতার নিয়ম" : "Eligibility rules" },
        ]}
      />

      <div className="mb-4">
        <Disclaimer>
          {lang === "bn"
            ? "এই নিয়মগুলো কনফিগারযোগ্য অপারেশনাল নিয়ম, ক্লিনিক্যাল মূল্যায়নের বিকল্প নয়। (These rules are configurable operational rules and are not a substitute for clinical assessment.)"
            : "These rules are configurable operational rules and are not a substitute for clinical assessment."}
        </Disclaimer>
      </div>

      {canManage ? (
        <Card className="mb-4">
          <CardHeader
            title={lang === "bn" ? "নতুন সংস্করণ তৈরি" : "Create a new rule version"}
            subtitle={
              lang === "bn"
                ? "নতুন সংস্করণ নিষ্ক্রিয় অবস্থায় তৈরি হয়; সক্রিয় করতে আলাদা নিশ্চিতকরণ লাগবে।"
                : "New versions are created inactive; activating requires a separate confirmation."
            }
          />
          <RecordForm
            lang={lang}
            endpoint="/api/admin/eligibility-rules"
            submitLabel={lang === "bn" ? "সংস্করণ তৈরি" : "Create version"}
            fields={[
              { name: "version", label: lang === "bn" ? "সংস্করণ" : "Version", required: true, placeholder: "2026.1" },
              { name: "effectiveFrom", label: lang === "bn" ? "কার্যকর তারিখ" : "Effective from", type: "date", required: true },
              { name: "minAge", label: lang === "bn" ? "ন্যূনতম বয়স" : "Min age", type: "number", required: true },
              { name: "maxAge", label: lang === "bn" ? "সর্বোচ্চ বয়স" : "Max age", type: "number", required: true },
              { name: "minWeightKg", label: lang === "bn" ? "ন্যূনতম ওজন (কেজি)" : "Min weight (kg)", type: "number", required: true },
              { name: "defaultIntervalDays", label: lang === "bn" ? "ডিফল্ট বিরতি (দিন)" : "Default interval (days)", type: "number", required: true },
              { name: "maleIntervalDays", label: lang === "bn" ? "পুরুষ বিরতি (দিন)" : "Male interval (days)", type: "number", required: true },
              { name: "femaleIntervalDays", label: lang === "bn" ? "নারী বিরতি (দিন)" : "Female interval (days)", type: "number", required: true },
              { name: "source", label: lang === "bn" ? "উৎস" : "Source", placeholder: "DGHS / BDRCS guideline reference" },
              {
                name: "temporaryDeferralRules",
                label: lang === "bn" ? "সাময়িক বিরতির নিয়ম (JSON)" : "Temporary deferral rules (JSON)",
                type: "textarea",
                placeholder: '{"afterFever":14,"afterAntibiotics":7}',
              },
            ]}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={lang === "bn" ? "সংস্করণসমূহ" : "Rule versions"}
          subtitle={
            active
              ? `${lang === "bn" ? "সক্রিয় সংস্করণ" : "Active version"}: ${active.version}`
              : lang === "bn"
                ? "কোনো সক্রিয় সংস্করণ নেই"
                : "No active version"
          }
        />
        {rules.length === 0 ? (
          <EmptyState
            icon="☰"
            title={lang === "bn" ? "কোনো নিয়ম নেই" : "No rule versions"}
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>{lang === "bn" ? "সংস্করণ" : "Version"}</Th>
                <Th>{lang === "bn" ? "বয়স" : "Age"}</Th>
                <Th>{lang === "bn" ? "ওজন" : "Weight"}</Th>
                <Th>{lang === "bn" ? "বিরতি (ডিফল্ট/পু/না)" : "Interval (def/M/F)"}</Th>
                <Th>{lang === "bn" ? "সাময়িক বিরতি" : "Deferrals"}</Th>
                <Th>{lang === "bn" ? "কার্যকর" : "Effective"}</Th>
                <Th>{lang === "bn" ? "উৎস" : "Source"}</Th>
                <Th>{lang === "bn" ? "অবস্থা" : "State"}</Th>
                <Th>{lang === "bn" ? "ব্যবস্থা" : "Actions"}</Th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="align-top hover:bg-slate-50/70">
                  <Td className="font-medium text-slate-900">{r.version}</Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {r.minAge}–{r.maxAge}
                  </Td>
                  <Td className="text-slate-600">{r.minWeightKg} kg</Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {r.defaultIntervalDays} / {r.maleIntervalDays} / {r.femaleIntervalDays}
                  </Td>
                  <Td>
                    <JsonViewer data={r.temporaryDeferralRules} label="JSON" />
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {fmtDate(r.effectiveFrom, lang)}
                  </Td>
                  <Td className="max-w-xs text-xs text-slate-500">{r.source ?? "—"}</Td>
                  <Td>
                    {r.isActive ? (
                      <Badge tone="success">{lang === "bn" ? "সক্রিয়" : "Active"}</Badge>
                    ) : (
                      <Badge tone="neutral">{lang === "bn" ? "নিষ্ক্রিয়" : "Inactive"}</Badge>
                    )}
                  </Td>
                  <Td>
                    {canManage && !r.isActive ? (
                      <ActionButton
                        lang={lang}
                        tone="danger"
                        endpoint={`/api/admin/eligibility-rules/${r.id}/activate`}
                        label={lang === "bn" ? "সক্রিয় করুন" : "Activate"}
                        confirmTitle={
                          lang === "bn"
                            ? `সংস্করণ ${r.version} সক্রিয় করবেন?`
                            : `Activate version ${r.version}?`
                        }
                        confirmBody={
                          lang === "bn"
                            ? "এটি সমগ্র নেটওয়ার্কে যোগ্যতা গণনাকে প্রভাবিত করবে। পূর্ববর্তী সংস্করণ নিষ্ক্রিয় হবে কিন্তু মুছে যাবে না। এই নিয়মগুলো ক্লিনিক্যাল মূল্যায়নের বিকল্প নয়।"
                            : "This affects eligibility calculations across the network. The previous version is deactivated but never deleted. These rules are not a substitute for clinical assessment."
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
