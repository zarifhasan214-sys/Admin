import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
const keepEmail = "superadmin@mbn.test";

async function main() {
  await client.connect();
  try {
    await client.query("begin");
    await client.query(`
      truncate table
        audit_logs,
        notifications,
        notification_preferences,
        donor_responses,
        donations,
        reports,
        blood_requests,
        donor_profiles,
        sessions,
        locations,
        emergency_contacts,
        eligibility_rules,
        email_outbox,
        system_settings
      restart identity cascade
    `);
    await client.query("delete from users where email <> $1", [keepEmail]);
    await client.query("commit");
    console.log(`Demo data removed. Kept admin account: ${keepEmail}`);
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
