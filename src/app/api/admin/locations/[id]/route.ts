import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminApi("manage:locations");
    const id = Number((await context.params).id);
    if (!Number.isInteger(id)) throw validationError("Invalid id");

    const body = (await request.json()) as {
      isActive?: boolean;
      nameBn?: string;
      nameEn?: string;
      sourceUrl?: string;
    };

    const [existing] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);
    if (!existing) throw validationError("Location not found");

    const update: Partial<typeof locations.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.isActive === "boolean") update.isActive = body.isActive;
    if (body.nameBn?.trim()) update.nameBn = body.nameBn.trim();
    if (body.nameEn?.trim()) update.nameEn = body.nameEn.trim();
    if (body.sourceUrl?.trim()) update.sourceUrl = body.sourceUrl.trim();

    await db.update(locations).set(update).where(eq(locations.id, id));

    await writeAudit({
      actor,
      action: "LOCATION_UPDATED",
      resourceType: "LOCATION",
      resourceId: id,
      previousState: {
        nameBn: existing.nameBn,
        nameEn: existing.nameEn,
        isActive: existing.isActive,
      },
      newState: update as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
