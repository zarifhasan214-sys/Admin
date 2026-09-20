import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

function num(value: unknown, field: string, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw validationError(`${field} must be between ${min} and ${max}`);
  }
  return Math.round(n);
}

/** Create a new rule version (never overwrite history). */
export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi("manage:eligibility");
    const body = (await request.json()) as Record<string, string>;

    const version = (body.version ?? "").trim();
    if (!/^[\w.\-]{3,40}$/.test(version)) {
      throw validationError("A valid version identifier is required");
    }
    const effectiveFrom = (body.effectiveFrom ?? "").trim();
    if (!effectiveFrom) throw validationError("An effective date is required");

    const existing = await db
      .select({ id: eligibilityRules.id })
      .from(eligibilityRules)
      .where(eq(eligibilityRules.ruleVersion, version))
      .limit(1);
    if (existing.length > 0) {
      throw validationError("This rule version already exists");
    }

    const minAge = num(body.minimumAge, "Minimum age", 16, 70);
    const maxAge = num(body.maximumAge, "Maximum age", 17, 100);
    if (maxAge <= minAge) throw validationError("Maximum age must exceed minimum age");

    const [created] = await db
      .insert(eligibilityRules)
      .values({
        ruleVersion: version,
        minimumAge: minAge,
        maximumAge: maxAge,
        minimumWeightKg: num(body.minWeightKg, "Minimum weight", 40, 120),
        defaultDonationIntervalDays: num(body.defaultIntervalDays, "Default interval", 30, 365),
        maleDonationIntervalDays: num(body.maleIntervalDays, "Male interval", 30, 365),
        femaleDonationIntervalDays: num(body.femaleIntervalDays, "Female interval", 30, 365),
        temporaryDeferralRules: body.temporaryDeferralRules
          ? safeJson(body.temporaryDeferralRules)
          : null,
        effectiveDate: effectiveFrom,
        source: (body.source ?? "").trim() || "Admin configured",
        active: false,
      })
      .returning();

    await writeAudit({
      actor,
      action: "ELIGIBILITY_RULE_CREATED",
      resourceType: "ELIGIBILITY_RULE",
      resourceId: created!.id,
      newState: { ruleVersion: version, effectiveDate: effectiveFrom, isActive: false },
    });

    return NextResponse.json({ ok: true, id: created!.id });
  } catch (error) {
    return apiError(error);
  }
}

function safeJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    throw validationError("Temporary deferral rules must be valid JSON");
  }
  throw validationError("Temporary deferral rules must be a JSON object");
}
