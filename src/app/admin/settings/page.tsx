import { count, desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { sessions, systemSettings } from "@/db/schema";
import { RecordForm } from "@/components/admin/record-form";
import {
  Card,
  CardHeader,
  DetailRow,
  PageHeader,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-guard";
import { fmtDate } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdminPage("manage:settings");
  const lang = await getLang();

  const [rows, [activeSessions], recentSessions] = await Promise.all([
    db.select().from(systemSettings),
    db
      .select({ value: count() })
      .from(sessions)
      .where(gte(sessions.expiresAt, new Date())),
    db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(5),
  ]);

  const value = (key: string) => rows.find((r) => r.key === key)?.value ?? "";

  return (
    <div>
      <PageHeader
        title={lang === "bn" ? "সিস্টেম সেটিংস" : "System settings"}
        subtitle={
          lang === "bn"
            ? "শুধু ব্যাকএন্ড-সমর্থিত কনফিগারেশন"
            : "Only configuration that is actually supported by the backend"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/admin" },
          { label: lang === "bn" ? "সেটিংস" : "Settings" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={lang === "bn" ? "সাধারণ" : "General"} />
          <RecordForm
            lang={lang}
            compact
            method="PATCH"
            endpoint="/api/admin/settings"
            submitLabel={lang === "bn" ? "সংরক্ষণ" : "Save"}
            initial={{
              site_name: value("site_name"),
              default_language: value("default_language"),
              timezone: value("timezone"),
              maintenance_mode: value("maintenance_mode"),
            }}
            fields={[
              { name: "site_name", label: lang === "bn" ? "সাইটের নাম" : "Site name", required: true },
              {
                name: "default_language",
                label: lang === "bn" ? "ডিফল্ট ভাষা" : "Default language",
                type: "select",
                required: true,
                options: [
                  { value: "bn", label: "বাংলা (bn)" },
                  { value: "en", label: "English (en)" },
                ],
              },
              { name: "timezone", label: lang === "bn" ? "টাইমজোন" : "Timezone", required: true },
              {
                name: "maintenance_mode",
                label: lang === "bn" ? "মেইনটেন্যান্স মোড" : "Maintenance mode",
                type: "select",
                options: [
                  { value: "false", label: lang === "bn" ? "বন্ধ" : "Off" },
                  { value: "true", label: lang === "bn" ? "চালু" : "On" },
                ],
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={lang === "bn" ? "নোটিফিকেশন ও ব্লাড নেটওয়ার্ক" : "Notifications & blood network"} />
          <RecordForm
            lang={lang}
            compact
            method="PATCH"
            endpoint="/api/admin/settings"
            submitLabel={lang === "bn" ? "সংরক্ষণ" : "Save"}
            initial={{
              announcements_enabled: value("announcements_enabled"),
              request_expiry_days: value("request_expiry_days"),
            }}
            fields={[
              {
                name: "announcements_enabled",
                label: lang === "bn" ? "ঘোষণা চালু" : "Announcements enabled",
                type: "select",
                options: [
                  { value: "true", label: lang === "bn" ? "চালু" : "Enabled" },
                  { value: "false", label: lang === "bn" ? "বন্ধ" : "Disabled" },
                ],
              },
              {
                name: "request_expiry_days",
                label: lang === "bn" ? "অনুরোধ মেয়াদ (দিন)" : "Request expiry (days)",
                type: "number",
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={lang === "bn" ? "নিরাপত্তা" : "Security"} />
          <RecordForm
            lang={lang}
            compact
            method="PATCH"
            endpoint="/api/admin/settings"
            submitLabel={lang === "bn" ? "সংরক্ষণ" : "Save"}
            initial={{ session_days: value("session_days") }}
            fields={[
              {
                name: "session_days",
                label: lang === "bn" ? "সেশন মেয়াদ (দিন)" : "Session lifetime (days)",
                type: "number",
                help:
                  lang === "bn"
                    ? "নতুন লগইনের ক্ষেত্রে প্রযোজ্য নীতি।"
                    : "Policy applied to newly issued sessions.",
              },
            ]}
          />
          <dl>
            <DetailRow label={lang === "bn" ? "সক্রিয় সেশন" : "Active sessions"}>
              {activeSessions?.value ?? 0}
            </DetailRow>
            {recentSessions.map((s) => (
              <DetailRow key={s.id} label={`#${s.id} · ${s.ipAddress ?? "—"}`}>
                {fmtDate(s.createdAt, lang, true)}
              </DetailRow>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader title={lang === "bn" ? "বর্তমান কনফিগারেশন" : "Current configuration"} />
          <dl>
            {rows.map((r) => (
              <DetailRow key={r.key} label={r.key}>
                {r.value || "—"}
              </DetailRow>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
