import { NextResponse } from "next/server";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import {
  apiError,
  requireAdminApi,
  validationError,
  writeAudit,
} from "@/lib/admin-guard";

type Payload = Record<string, string | boolean | undefined>;

function str(payload: Payload, key: string): string {
  const v = payload[key];
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi("manage:emergency_contacts");
    const body = (await request.json()) as Payload;

    const nameBn = str(body, "nameBn");
    const nameEn = str(body, "nameEn");
    const phone = str(body, "phone");
    const category = str(body, "category");
    const sourceUrl = str(body, "sourceUrl");
    const lastVerified = str(body, "lastVerifiedAt");

    if (!nameBn || !nameEn || !phone || !category) {
      throw validationError("Bangla name, English name, phone and category are required");
    }
    if (!/^https?:\/\//.test(sourceUrl)) {
      throw validationError(
        "A verifiable source URL is required for emergency contact information",
      );
    }
    if (!lastVerified) {
      throw validationError("A verification date is required");
    }

    const [created] = await db
      .insert(emergencyContacts)
      .values({
        nameBn,
        nameEn,
        organization: str(body, "organization") || null,
        phone,
        alternatePhone: str(body, "alternatePhone") || null,
        address: str(body, "address") || null,
        category,
        sourceUrl,
        lastVerifiedAt: new Date(lastVerified),
        isActive: true,
      })
      .returning();

    await writeAudit({
      actor,
      action: "EMERGENCY_CONTACT_CREATED",
      resourceType: "EMERGENCY_CONTACT",
      resourceId: created!.id,
      newState: { nameEn, phone, category, sourceUrl },
    });

    return NextResponse.json({ ok: true, id: created!.id });
  } catch (error) {
    return apiError(error);
  }
}
