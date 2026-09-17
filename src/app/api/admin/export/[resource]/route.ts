import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  bloodRequests,
  donations,
  donorProfiles,
  reports,
  users,
} from "@/db/schema";
import { apiError, requireAdminApi, validationError, writeAudit } from "@/lib/admin-guard";

const MAX_ROWS = 5000;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return `"${s.replaceAll('"', '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    const actor = await requireAdminApi("export:data");
    const { resource } = await context.params;

    let rows: Record<string, unknown>[] = [];

    if (resource === "users") {
      rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(MAX_ROWS);
    } else if (resource === "donors") {
      rows = await db
        .select({
          id: donorProfiles.id,
          name: users.name,
          bloodGroup: donorProfiles.bloodGroup,
          gender: donorProfiles.gender,
          phone: donorProfiles.phone,
          district: donorProfiles.district,
          upazila: donorProfiles.upazila,
          union: donorProfiles.unionName,
          availability: donorProfiles.availability,
          verificationStatus: donorProfiles.verificationStatus,
          donationCount: donorProfiles.donationCount,
          lastDonationDate: donorProfiles.lastDonationDate,
        })
        .from(donorProfiles)
        .innerJoin(users, eq(users.id, donorProfiles.userId))
        .orderBy(desc(donorProfiles.createdAt))
        .limit(MAX_ROWS);
    } else if (resource === "requests") {
      rows = await db
        .select({
          id: bloodRequests.id,
          patientName: bloodRequests.patientName,
          bloodGroup: bloodRequests.bloodGroup,
          unitsRequired: bloodRequests.unitsRequired,
          hospitalName: bloodRequests.hospitalName,
          district: bloodRequests.district,
          upazila: bloodRequests.upazila,
          requiredDate: bloodRequests.requiredDate,
          urgency: bloodRequests.urgency,
          status: bloodRequests.status,
          createdAt: bloodRequests.createdAt,
        })
        .from(bloodRequests)
        .orderBy(desc(bloodRequests.createdAt))
        .limit(MAX_ROWS);
    } else if (resource === "donations") {
      rows = await db
        .select({
          id: donations.id,
          donor: users.name,
          bloodGroup: donations.bloodGroup,
          donationDate: donations.donationDate,
          location: donations.locationName,
          district: donations.district,
          upazila: donations.upazila,
          requestId: donations.requestId,
          ruleVersion: donations.ruleVersion,
        })
        .from(donations)
        .innerJoin(donorProfiles, eq(donorProfiles.id, donations.donorId))
        .innerJoin(users, eq(users.id, donorProfiles.userId))
        .orderBy(desc(donations.donationDate))
        .limit(MAX_ROWS);
    } else if (resource === "reports") {
      rows = await db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetId: reports.targetId,
          reason: reports.reason,
          priority: reports.priority,
          status: reports.status,
          createdAt: reports.createdAt,
          resolvedAt: reports.resolvedAt,
        })
        .from(reports)
        .orderBy(desc(reports.createdAt))
        .limit(MAX_ROWS);
    } else {
      throw validationError("Unknown export resource");
    }

    await writeAudit({
      actor,
      action: "DATA_EXPORTED",
      resourceType: "EXPORT",
      resourceId: resource,
      newState: { rows: rows.length },
    });

    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="mbn-${resource}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
