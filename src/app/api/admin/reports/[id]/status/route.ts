import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, reportStatusEnum } from "@/db/schema";
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
    const actor = await requireAdminApi("moderate:reports");
    const id = (await context.params).id;
    if (!id) throw validationError("Invalid report id");

    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status ?? "";
    if (!reportStatusEnum.enumValues.includes(status as "RESOLVED")) {
      throw validationError("Invalid status");
    }
    const note = (body.note ?? "").trim();
    if (
      ["RESOLVED", "REJECTED", "DISMISSED"].includes(status) &&
      note.length < 3
    ) {
      throw validationError("A resolution note is required");
    }

    const [existing] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    if (!existing) throw validationError("Report not found");
    if (["RESOLVED", "REJECTED", "DISMISSED"].includes(existing.status)) {
      throw validationError("This report is already closed");
    }

    const closing = status !== "PENDING" && status !== "UNDER_REVIEW";

    await db
      .update(reports)
      .set({
        status: status as "RESOLVED",
        assignedTo: status === "UNDER_REVIEW" ? actor.id : existing.assignedTo,
        resolutionNote: closing ? note : existing.resolutionNote,
        resolvedBy: closing ? actor.id : null,
        resolvedAt: closing ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, id));

    await writeAudit({
      actor,
      action: "REPORT_STATUS_CHANGED",
      resourceType: "REPORT",
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status, note: note || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
