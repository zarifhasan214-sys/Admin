import { NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminApi("manage:eligibility");
    const id = Number((await context.params).id);
    if (!Number.isInteger(id)) throw validationError("Invalid rule id");

    const [rule] = await db
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.id, id))
      .limit(1);
    if (!rule) throw validationError("Rule version not found");
    if (rule.isActive) throw validationError("This version is already active");

    const [previous] = await db
      .select({ id: eligibilityRules.id, version: eligibilityRules.version })
      .from(eligibilityRules)
      .where(eq(eligibilityRules.isActive, true))
      .limit(1);

    await db
      .update(eligibilityRules)
      .set({ isActive: false })
      .where(ne(eligibilityRules.id, id));
    await db
      .update(eligibilityRules)
      .set({ isActive: true })
      .where(eq(eligibilityRules.id, id));

    await writeAudit({
      actor,
      action: "ELIGIBILITY_RULE_ACTIVATED",
      resourceType: "ELIGIBILITY_RULE",
      resourceId: id,
      previousState: previous
        ? { activeVersion: previous.version, id: previous.id }
        : null,
      newState: { activeVersion: rule.version, id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
