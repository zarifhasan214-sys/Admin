import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

/** Only these keys are supported by the backend. */
export const SETTING_KEYS = [
  "site_name",
  "default_language",
  "timezone",
  "maintenance_mode",
  "announcements_enabled",
  "request_expiry_days",
  "session_days",
] as const;

export async function PATCH(request: Request) {
  try {
    const actor = await requireAdminApi("manage:settings");
    const body = (await request.json()) as Record<string, string | boolean>;

    const updates = Object.entries(body).filter(([key]) =>
      (SETTING_KEYS as readonly string[]).includes(key),
    );
    if (updates.length === 0) throw validationError("No supported settings provided");

    const existing = await db.select().from(systemSettings);
    const previous = Object.fromEntries(existing.map((s) => [s.key, s.value]));

    for (const [key, raw] of updates) {
      const value = typeof raw === "boolean" ? String(raw) : raw.trim();
      if (key === "default_language" && !["bn", "en"].includes(value)) {
        throw validationError("Default language must be bn or en");
      }
      if (
        (key === "request_expiry_days" || key === "session_days") &&
        !/^\d{1,3}$/.test(value)
      ) {
        throw validationError("Day values must be numeric");
      }
      const found = existing.find((s) => s.key === key);
      if (found) {
        await db
          .update(systemSettings)
          .set({ value, updatedBy: actor.id, updatedAt: new Date() })
          .where(eq(systemSettings.key, key));
      } else {
        await db
          .insert(systemSettings)
          .values({ key, value, updatedBy: actor.id });
      }
    }

    await writeAudit({
      actor,
      action: "SETTINGS_UPDATED",
      resourceType: "SYSTEM_SETTING",
      resourceId: "system",
      previousState: previous,
      newState: Object.fromEntries(updates) as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
