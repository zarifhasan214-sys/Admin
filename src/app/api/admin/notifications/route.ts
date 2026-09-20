import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, notifications, users } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

export type Audience =
  | "ALL_USERS"
  | "DONORS"
  | "VERIFIED_DONORS"
  | "AVAILABLE_DONORS"
  | "SINGLE_USER";

export async function resolveRecipients(body: {
  audience?: string;
  userId?: string;
  bloodGroup?: string;
  union?: string;
}): Promise<string[]> {
  const audience = (body.audience ?? "") as Audience;

  if (audience === "SINGLE_USER") {
    const id = body.userId;
    if (!id) throw validationError("A valid user id is required");
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.status, "ACTIVE")))
      .limit(1);
    if (rows.length === 0) throw validationError("Active user not found");
    return rows.map((r) => r.id);
  }

  if (audience === "ALL_USERS") {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "ACTIVE"));
    return rows.map((r) => r.id);
  }

  if (!["DONORS", "VERIFIED_DONORS", "AVAILABLE_DONORS"].includes(audience)) {
    throw validationError("Invalid audience");
  }

  const filters: SQL[] = [eq(users.status, "ACTIVE")];
  if (audience === "VERIFIED_DONORS" || audience === "AVAILABLE_DONORS") {
    filters.push(eq(donorProfiles.verificationStatus, "VERIFIED"));
  }
  if (audience === "AVAILABLE_DONORS") {
    filters.push(eq(donorProfiles.availabilityStatus, "AVAILABLE"));
  }
  if (body.bloodGroup) {
    filters.push(eq(donorProfiles.bloodGroup, body.bloodGroup as "A+"));
  }
  if (body.union) {
    filters.push(eq(donorProfiles.unionName, body.union));
  }

  const rows = await db
    .select({ id: users.id })
    .from(donorProfiles)
    .innerJoin(users, eq(users.id, donorProfiles.userId))
    .where(and(...filters));
  return rows.map((r) => r.id);
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi("manage:notifications");
    const body = (await request.json()) as Record<string, string>;

    const titleBn = (body.titleBn ?? "").trim();
    const titleEn = (body.titleEn ?? "").trim();
    if (titleBn.length < 3 || titleEn.length < 3) {
      throw validationError("Both Bangla and English titles are required");
    }

    const recipients = await resolveRecipients(body);
    if (recipients.length === 0) {
      throw validationError("No recipients match this audience");
    }

    const broadcastId = randomUUID();
    const rows = recipients.map((userId) => ({
      userId,
      titleBn,
      titleEn,
      bodyBn: (body.bodyBn ?? "").trim() || titleBn,
      bodyEn: (body.bodyEn ?? "").trim() || titleEn,
      link: (body.link ?? "").trim() || null,
      type: (body.type ?? "ANNOUNCEMENT").trim(),
      broadcastId,
      createdBy: actor.id,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(notifications).values(rows.slice(i, i + 500));
    }

    await writeAudit({
      actor,
      action: "NOTIFICATION_BROADCAST",
      resourceType: "NOTIFICATION",
      resourceId: broadcastId,
      newState: {
        audience: body.audience,
        bloodGroup: body.bloodGroup ?? null,
        union: body.union ?? null,
        recipients: recipients.length,
        titleEn,
      },
    });

    return NextResponse.json({ ok: true, recipients: recipients.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  // Recipient preview (no mutation).
  try {
    await requireAdminApi("manage:notifications");
    const body = (await request.json()) as Record<string, string>;
    const recipients = await resolveRecipients(body);
    return NextResponse.json({ count: recipients.length });
  } catch (error) {
    return apiError(error);
  }
}

export const runtime = "nodejs";
