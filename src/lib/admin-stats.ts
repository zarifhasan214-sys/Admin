import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  bloodRequests,
  donations,
  donorProfiles,
  reports,
  users,
} from "@/db/schema";

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalDonors: number;
  verifiedDonors: number;
  availableDonors: number;
  pendingDonorVerification: number;
  totalRequests: number;
  pendingRequests: number;
  activeRequests: number;
  criticalRequests: number;
  completedRequests: number;
  openReports: number;
  criticalReports: number;
  completedDonations: number;
  suspendedAccounts: number;
  expiringRequests: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [u] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${users.status} = 'ACTIVE')::int`,
      suspended: sql<number>`count(*) filter (where ${users.status} = 'SUSPENDED')::int`,
    })
    .from(users);

  const [d] = await db
    .select({
      total: count(),
      verified: sql<number>`count(*) filter (where ${donorProfiles.verificationStatus} = 'VERIFIED')::int`,
      available: sql<number>`count(*) filter (where ${donorProfiles.availability} = 'AVAILABLE' and ${donorProfiles.verificationStatus} = 'VERIFIED')::int`,
      pending: sql<number>`count(*) filter (where ${donorProfiles.verificationStatus} = 'PENDING_REVIEW')::int`,
    })
    .from(donorProfiles);

  const [r] = await db
    .select({
      total: count(),
      pending: sql<number>`count(*) filter (where ${bloodRequests.status} = 'PENDING_REVIEW')::int`,
      active: sql<number>`count(*) filter (where ${bloodRequests.status} in ('VERIFIED','SEARCHING_FOR_DONOR','DONOR_CONTACTED','ACCEPTED'))::int`,
      critical: sql<number>`count(*) filter (where ${bloodRequests.urgency} = 'CRITICAL' and ${bloodRequests.status} not in ('COMPLETED','CANCELLED','EXPIRED','REJECTED'))::int`,
      completed: sql<number>`count(*) filter (where ${bloodRequests.status} = 'COMPLETED')::int`,
      expiring: sql<number>`count(*) filter (where ${bloodRequests.status} in ('VERIFIED','SEARCHING_FOR_DONOR','DONOR_CONTACTED') and ${bloodRequests.requiredDate} <= current_date + 2)::int`,
    })
    .from(bloodRequests);

  const [rep] = await db
    .select({
      open: sql<number>`count(*) filter (where ${reports.status} in ('PENDING','UNDER_REVIEW'))::int`,
      critical: sql<number>`count(*) filter (where ${reports.status} in ('PENDING','UNDER_REVIEW') and ${reports.priority} in ('HIGH','CRITICAL'))::int`,
    })
    .from(reports);

  const [don] = await db.select({ total: count() }).from(donations);

  return {
    totalUsers: u?.total ?? 0,
    activeUsers: u?.active ?? 0,
    suspendedAccounts: u?.suspended ?? 0,
    totalDonors: d?.total ?? 0,
    verifiedDonors: d?.verified ?? 0,
    availableDonors: d?.available ?? 0,
    pendingDonorVerification: d?.pending ?? 0,
    totalRequests: r?.total ?? 0,
    pendingRequests: r?.pending ?? 0,
    activeRequests: r?.active ?? 0,
    criticalRequests: r?.critical ?? 0,
    completedRequests: r?.completed ?? 0,
    expiringRequests: r?.expiring ?? 0,
    openReports: rep?.open ?? 0,
    criticalReports: rep?.critical ?? 0,
    completedDonations: don?.total ?? 0,
  };
}

export type Bucket = { label: string; value: number };

/** Daily counts over the last `days` days for a table's timestamp column. */
export async function dailySeries(
  table: "users" | "donor_profiles" | "blood_requests" | "donations",
  days: number,
): Promise<Bucket[]> {
  const column = table === "donations" ? "created_at" : "created_at";
  const rows = await db.execute<{ d: string; c: number }>(
    sql.raw(`
      select to_char(g.day, 'YYYY-MM-DD') as d, coalesce(t.c, 0)::int as c
      from generate_series(current_date - interval '${days - 1} day', current_date, interval '1 day') as g(day)
      left join (
        select date_trunc('day', ${column}) as day, count(*)::int as c
        from ${table}
        where ${column} >= current_date - interval '${days - 1} day'
        group by 1
      ) t on t.day = g.day
      order by g.day
    `),
  );
  return rows.rows.map((row) => ({ label: row.d.slice(5), value: Number(row.c) }));
}

export async function groupCount<T extends string>(
  query: Promise<{ key: T | null; value: number }[]>,
): Promise<Bucket[]> {
  const rows = await query;
  return rows.map((r) => ({ label: r.key ?? "—", value: Number(r.value) }));
}

export async function requestStatusBreakdown(from?: Date): Promise<Bucket[]> {
  const rows = await db
    .select({ key: bloodRequests.status, value: count() })
    .from(bloodRequests)
    .where(from ? gte(bloodRequests.createdAt, from) : undefined)
    .groupBy(bloodRequests.status);
  return rows.map((r) => ({ label: r.key.replaceAll("_", " "), value: r.value }));
}

export async function bloodGroupBreakdown(): Promise<Bucket[]> {
  const rows = await db
    .select({ key: donorProfiles.bloodGroup, value: count() })
    .from(donorProfiles)
    .groupBy(donorProfiles.bloodGroup);
  const order = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  return order.map((g) => ({
    label: g,
    value: rows.find((r) => r.key === g)?.value ?? 0,
  }));
}

export async function availabilityBreakdown(): Promise<Bucket[]> {
  const rows = await db
    .select({ key: donorProfiles.availability, value: count() })
    .from(donorProfiles)
    .groupBy(donorProfiles.availability);
  return rows.map((r) => ({ label: r.key.replaceAll("_", " "), value: r.value }));
}

export async function urgencyBreakdown(from?: Date): Promise<Bucket[]> {
  const rows = await db
    .select({ key: bloodRequests.urgency, value: count() })
    .from(bloodRequests)
    .where(from ? gte(bloodRequests.createdAt, from) : undefined)
    .groupBy(bloodRequests.urgency);
  const order = ["ROUTINE", "URGENT", "CRITICAL"];
  return order.map((g) => ({
    label: g,
    value: rows.find((r) => r.key === g)?.value ?? 0,
  }));
}

export async function donorVerificationBreakdown(): Promise<Bucket[]> {
  const rows = await db
    .select({ key: donorProfiles.verificationStatus, value: count() })
    .from(donorProfiles)
    .groupBy(donorProfiles.verificationStatus);
  return rows.map((r) => ({ label: r.key.replaceAll("_", " "), value: r.value }));
}

export async function recentAudit(limit = 12) {
  return db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      actorRole: auditLogs.actorRole,
      actorName: sql<string | null>`null`,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      previousState: auditLogs.previousState,
      newState: auditLogs.newState,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function recentUsers(limit = 6) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ["USER"]))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function pendingVerificationDonors(limit = 5) {
  return db
    .select({
      id: donorProfiles.id,
      name: users.name,
      bloodGroup: donorProfiles.bloodGroup,
      updatedAt: donorProfiles.updatedAt,
    })
    .from(donorProfiles)
    .innerJoin(users, eq(users.id, donorProfiles.userId))
    .where(eq(donorProfiles.verificationStatus, "PENDING_REVIEW"))
    .orderBy(donorProfiles.updatedAt)
    .limit(limit);
}

export async function criticalOpenRequests(limit = 5) {
  return db
    .select({
      id: bloodRequests.id,
      patientName: bloodRequests.patientName,
      bloodGroup: bloodRequests.bloodGroup,
      hospitalName: bloodRequests.hospitalName,
      urgency: bloodRequests.urgency,
      status: bloodRequests.status,
      requiredDate: bloodRequests.requiredDate,
      createdAt: bloodRequests.createdAt,
    })
    .from(bloodRequests)
    .where(
      and(
        eq(bloodRequests.urgency, "CRITICAL"),
        inArray(bloodRequests.status, [
          "PENDING_REVIEW",
          "VERIFIED",
          "SEARCHING_FOR_DONOR",
          "DONOR_CONTACTED",
        ]),
      ),
    )
    .orderBy(desc(bloodRequests.createdAt))
    .limit(limit);
}
