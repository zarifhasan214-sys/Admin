import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
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
    const actor = await requireAdminApi("manage:emergency_contacts");
    const id = (await context.params).id;
    if (!id) throw validationError("Invalid id");

    const body = (await request.json()) as {
      isActive?: boolean;
      phone?: string;
      alternatePhone?: string;
      address?: string;
      sourceUrl?: string;
      lastVerifiedAt?: string;
    };

    const [existing] = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.id, id))
      .limit(1);
    if (!existing) throw validationError("Contact not found");

    const update: Partial<typeof emergencyContacts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof body.isActive === "boolean") update.active = body.isActive;
    if (body.phone) update.phone = body.phone.trim();
    if (body.alternatePhone !== undefined)
      update.alternatePhone = body.alternatePhone.trim() || null;
    if (body.address !== undefined) update.address = body.address.trim() || null;
    if (body.sourceUrl) {
      if (!/^https?:\/\//.test(body.sourceUrl.trim())) {
        throw validationError("Source URL must be a valid link");
      }
      update.sourceUrl = body.sourceUrl.trim();
    }
    if (body.lastVerifiedAt) update.lastVerifiedAt = new Date(body.lastVerifiedAt);

    await db
      .update(emergencyContacts)
      .set(update)
      .where(eq(emergencyContacts.id, id));

    await writeAudit({
      actor,
      action: "EMERGENCY_CONTACT_UPDATED",
      resourceType: "EMERGENCY_CONTACT",
      resourceId: id,
      previousState: {
        isActive: existing.active,
        phone: existing.phone,
        sourceUrl: existing.sourceUrl,
      },
      newState: update as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
