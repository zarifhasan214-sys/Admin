import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles } from "@/db/schema";
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
    const actor = await requireAdminApi("moderate:donors");
    const donorId = Number((await context.params).id);
    if (!Number.isInteger(donorId)) throw validationError("Invalid donor id");

    const body = (await request.json()) as { isSearchable?: boolean; note?: string };
    if (typeof body.isSearchable !== "boolean") {
      throw validationError("Invalid payload");
    }

    const [donor] = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.id, donorId))
      .limit(1);
    if (!donor) throw validationError("Donor not found");

    if (body.isSearchable && donor.verificationStatus !== "VERIFIED") {
      throw validationError(
        "Only verified donors can be listed in the searchable directory",
      );
    }

    await db
      .update(donorProfiles)
      .set({ isSearchable: body.isSearchable, updatedAt: new Date() })
      .where(eq(donorProfiles.id, donorId));

    await writeAudit({
      actor,
      action: "DONOR_SEARCHABLE_CHANGED",
      resourceType: "DONOR",
      resourceId: donorId,
      previousState: { isSearchable: donor.isSearchable },
      newState: { isSearchable: body.isSearchable, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
