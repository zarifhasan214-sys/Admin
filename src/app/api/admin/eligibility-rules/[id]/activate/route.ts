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
    const id = (await context.params).id;
    if (!id) throw validationError("Invalid rule id");

    const [rule] = await db
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.id, id))
      .limit(1);
    if (!rule) throw validationError("Rule version not found");
    if (rule.active) throw validationError("This version is already active");

    const [previous] = await db
      .select({ id: eligibilityRules.id, version: eligibilityRules.ruleVersion })
      .from(eligibilityRules)
      .where(eq(eligibilityRules.active, true))
      .limit(1);

    await db
      .update(eligibilityRules)
      .set({ active: false })
      .where(ne(eligibilityRules.id, id));
    await db
      .update(eligibilityRules)
      .set({ active: true })
      .where(eq(eligibilityRules.id, id));

    await writeAudit({
      actor,
      action: "ELIGIBILITY_RULE_ACTIVATED",
      resourceType: "ELIGIBILITY_RULE",
      resourceId: id,
      previousState: previous
        ? { activeVersion: previous.ruleVersion, id: previous.id }
        : null,
      newState: { activeVersion: rule.ruleVersion, id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
