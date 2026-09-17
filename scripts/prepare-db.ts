import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
const tableNames = [
  "audit_logs",
  "blood_requests",
  "donations",
  "donor_profiles",
  "donor_requests",
  "eligibility_rules",
  "email_outbox",
  "email_tokens",
  "emergency_contacts",
  "locations",
  "notification_preferences",
  "notifications",
  "reports",
  "sessions",
  "system_settings",
  "users",
];
const enumNames = [
  "availability_status",
  "blood_group",
  "donor_request_status",
  "email_token_type",
  "gender",
  "report_priority",
  "report_status",
  "request_status",
  "request_urgency",
  "user_role",
  "user_status",
  "verification_status",
];

function identifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  await client.connect();
  try {
    await client.query("begin");
    await client.query("create schema if not exists legacy");

    for (const tableName of tableNames) {
      const legacyName = `legacy_${tableName}`;
      const exists = await client.query(
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
        [tableName],
      );
      const legacyExists = await client.query(
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
        [legacyName],
      );
      if (exists.rowCount && !legacyExists.rowCount) {
        await client.query(
          `alter table public.${identifier(tableName)} rename to ${identifier(legacyName)}`,
        );
        console.log(`Renamed table ${tableName} -> ${legacyName}`);
      }
      const publicLegacyExists = await client.query(
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
        [legacyName],
      );
      if (publicLegacyExists.rowCount) {
        await client.query(
          `alter table public.${identifier(legacyName)} set schema legacy`,
        );
        console.log(`Moved table legacy.${legacyName}`);
      }
    }

    for (const enumName of enumNames) {
      const legacyName = `legacy_${enumName}`;
      const exists = await client.query(
        "select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = $1",
        [enumName],
      );
      const legacyExists = await client.query(
        "select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = $1",
        [legacyName],
      );
      if (exists.rowCount && !legacyExists.rowCount) {
        await client.query(
          `alter type public.${identifier(enumName)} rename to ${identifier(legacyName)}`,
        );
        console.log(`Renamed enum ${enumName} -> ${legacyName}`);
      }
      const publicLegacyExists = await client.query(
        "select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = $1",
        [legacyName],
      );
      if (publicLegacyExists.rowCount) {
        await client.query(
          `alter type public.${identifier(legacyName)} set schema legacy`,
        );
        console.log(`Moved enum legacy.${legacyName}`);
      }
    }

    await client.query("commit");
    console.log("Legacy database objects preserved; ready to create the admin schema.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
