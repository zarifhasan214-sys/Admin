import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    await client.connect();
    const result = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    const enums = await client.query<{ enum_name: string }>(
      "select typname as enum_name from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typtype = 'e' and n.nspname = 'public' order by typname",
    );
    const columns = await client.query<{
      table_name: string;
      column_name: string;
      udt_name: string;
    }>(
      "select table_name, column_name, udt_name from information_schema.columns where table_schema = 'public' and table_name in ('users', 'donor_profiles', 'blood_requests', 'reports', 'donations', 'audit_logs') order by table_name, ordinal_position",
    );
    console.log(
      JSON.stringify({ tables: result.rows, enums: enums.rows, columns: columns.rows }, null, 2),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
