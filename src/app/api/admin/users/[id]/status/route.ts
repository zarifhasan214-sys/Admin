import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, userStatusEnum } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";
import { ROLE_LEVEL } from "@/lib/rbac";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminApi("moderate:accounts");
    const { id } = await context.params;
    const userId = id;
    if (!userId) throw validationError("Invalid user id");

    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status ?? "";
    if (!userStatusEnum.enumValues.includes(status as "ACTIVE")) {
      throw validationError("Invalid status");
    }
    if (status !== "ACTIVE" && !body.note) {
      throw validationError("A reason is required for this action");
    }

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) throw validationError("User not found");

    if (target.id === actor.id) {
      throw validationError("You cannot change your own account status");
    }
    if (ROLE_LEVEL[target.role] >= ROLE_LEVEL[actor.role]) {
      throw validationError(
        "You cannot moderate an account with an equal or higher role",
      );
    }

    await db
      .update(users)
      .set({
        status: status as "ACTIVE",
        statusReason: body.note ?? null,
        statusChangedAt: new Date(),
        statusChangedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await writeAudit({
      actor,
      action: "USER_STATUS_CHANGED",
      resourceType: "USER",
      resourceId: userId,
      previousState: { status: target.status, reason: target.statusReason },
      newState: { status, reason: body.note ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
