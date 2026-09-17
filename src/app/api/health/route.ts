import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name = 'users'
      limit 1
    `);
    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Database schema is not initialized" },
        { status: 503 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json(
      { ok: false, error: "Database is unavailable" },
      { status: 503 },
    );
  }
}
