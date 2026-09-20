import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, verificationStatusEnum } from "@/db/schema";
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
    const donorId = (await context.params).id;
    if (!donorId) throw validationError("Invalid donor id");

    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status ?? "";
    if (!verificationStatusEnum.enumValues.includes(status as "VERIFIED")) {
      throw validationError("Invalid verification status");
    }
    if (
      (status === "REJECTED" || status === "SUSPENDED") &&
      (body.note ?? "").trim().length < 3
    ) {
      throw validationError("A reason is required for this action");
    }

    const [donor] = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.id, donorId))
      .limit(1);
    if (!donor) throw validationError("Donor not found");

    await db
      .update(donorProfiles)
      .set({
        verificationStatus: status as "VERIFIED",
        verificationNote: body.note ?? null,
        verifiedBy: actor.id,
        verifiedAt: new Date(),
        searchable: status === "VERIFIED" ? donor.searchable : false,
        updatedAt: new Date(),
      })
      .where(eq(donorProfiles.id, donorId));

    await writeAudit({
      actor,
      action: `DONOR_${status}`,
      resourceType: "DONOR",
      resourceId: donorId,
      previousState: {
        verificationStatus: donor.verificationStatus,
        verifiedBy: donor.verifiedBy,
      },
      newState: { verificationStatus: status, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
