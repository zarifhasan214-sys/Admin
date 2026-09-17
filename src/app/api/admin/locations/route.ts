import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { locations, locationTypeEnum } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi("manage:locations");
    const body = (await request.json()) as Record<string, string>;
    const type = (body.type ?? "").trim();
    const nameBn = (body.nameBn ?? "").trim();
    const nameEn = (body.nameEn ?? "").trim();
    const sourceUrl = (body.sourceUrl ?? "").trim();
    const parentId = body.parentId ? Number(body.parentId) : null;

    if (!locationTypeEnum.enumValues.includes(type as "UNION")) {
      throw validationError("Invalid location type");
    }
    if (!nameBn || !nameEn) throw validationError("Both names are required");
    if (type !== "DISTRICT" && !parentId) {
      throw validationError("A parent location is required");
    }
    if (!/^https?:\/\//.test(sourceUrl)) {
      throw validationError("A verifiable source URL is required");
    }

    const duplicate = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.type, type as "UNION"),
          parentId ? eq(locations.parentId, parentId) : isNull(locations.parentId),
          sql`lower(${locations.nameEn}) = lower(${nameEn})`,
        ),
      )
      .limit(1);
    if (duplicate.length > 0) {
      throw validationError("This location already exists");
    }

    const [created] = await db
      .insert(locations)
      .values({
        type: type as "UNION",
        parentId,
        nameBn,
        nameEn,
        sourceUrl,
        isActive: true,
      })
      .returning();

    await writeAudit({
      actor,
      action: "LOCATION_CREATED",
      resourceType: "LOCATION",
      resourceId: created!.id,
      newState: { type, nameEn, nameBn, parentId, sourceUrl },
    });

    return NextResponse.json({ ok: true, id: created!.id });
  } catch (error) {
    return apiError(error);
  }
}
