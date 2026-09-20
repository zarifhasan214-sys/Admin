import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, requestStatusEnum } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";
import {
  canTransition,
  REQUIRES_NOTE,
  type RequestStatus,
} from "@/lib/request-flow";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdminApi("moderate:requests");
    const requestId = (await context.params).id;
    if (!requestId) throw validationError("Invalid request id");

    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status ?? "";
    if (!requestStatusEnum.enumValues.includes(status as "VERIFIED")) {
      throw validationError("Invalid status");
    }

    const [existing] = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.id, requestId))
      .limit(1);
    if (!existing) throw validationError("Request not found");

    const from = existing.status as RequestStatus;
    const to = status as RequestStatus;
    if (!canTransition(from, to)) {
      throw validationError(`Transition ${from} → ${to} is not allowed`);
    }
    if (REQUIRES_NOTE.includes(to) && (body.note ?? "").trim().length < 3) {
      throw validationError("A reason is required for this action");
    }

    await db
      .update(bloodRequests)
      .set({
        status: to,
        statusNote: body.note ?? null,
        verifiedBy:
          to === "VERIFIED" ? actor.id : (existing.verifiedBy ?? null),
        verifiedAt: to === "VERIFIED" ? new Date() : existing.verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(bloodRequests.id, requestId));

    await writeAudit({
      actor,
      action:
        to === "VERIFIED" ? "REQUEST_VERIFIED" : "REQUEST_STATUS_CHANGED",
      resourceType: "BLOOD_REQUEST",
      resourceId: requestId,
      previousState: { status: from },
      newState: { status: to, note: body.note ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
