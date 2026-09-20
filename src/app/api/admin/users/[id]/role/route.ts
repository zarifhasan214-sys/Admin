import { NextResponse } from "next/server";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, userRoleEnum } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminApi("manage:admins");
    const { id } = await context.params;
    const userId = id;
    if (!userId) throw validationError("Invalid user id");

    const body = (await request.json()) as { role?: string; note?: string };
    const role = body.role ?? "";
    if (!userRoleEnum.enumValues.includes(role as "USER")) {
      throw validationError("Invalid role");
    }

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) throw validationError("User not found");
    if (target.role === role) throw validationError("Role is already applied");

    if (target.id === actor.id) {
      throw validationError("You cannot change your own role");
    }

    if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      const [remaining] = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "SUPER_ADMIN"), ne(users.id, target.id)));
      if ((remaining?.value ?? 0) === 0) {
        throw validationError("At least one SUPER_ADMIN must remain");
      }
    }

    await db
      .update(users)
      .set({ role: role as "USER", updatedAt: new Date() })
      .where(eq(users.id, userId));

    await writeAudit({
      actor,
      action: "USER_ROLE_CHANGED",
      resourceType: "USER",
      resourceId: userId,
      previousState: { role: target.role },
      newState: { role, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
