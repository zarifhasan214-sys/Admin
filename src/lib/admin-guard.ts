import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, type User } from "@/db/schema";
import { clientIp, getCurrentUser } from "@/lib/auth";
import { can, isAdminRole, type Permission } from "@/lib/rbac";

export class AdminAuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Server component guard — redirects unauthorised visitors. */
export async function requireAdminPage(permission?: Permission): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminRole(user.role)) redirect("/?error=forbidden");
  if (user.status !== "ACTIVE") redirect("/login?error=inactive");
  if (permission && !can(user.role, permission)) redirect("/admin?error=denied");
  return user;
}

/** API route guard — throws AdminAuthError. */
export async function requireAdminApi(permission?: Permission): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AdminAuthError(401, "Unauthenticated");
  if (!isAdminRole(user.role) || user.status !== "ACTIVE") {
    throw new AdminAuthError(403, "Forbidden");
  }
  if (permission && !can(user.role, permission)) {
    throw new AdminAuthError(403, "Insufficient permissions");
  }
  return user;
}

type Json = Record<string, unknown> | null;

export async function writeAudit(params: {
  actor: User;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  previousState?: Json;
  newState?: Json;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    action: params.action,
    resourceType: params.resourceType,
    resourceId:
      params.resourceId === undefined || params.resourceId === null
        ? null
        : String(params.resourceId),
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    ipAddress: await clientIp(),
  });
}

export function apiError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.name === "ValidationError") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("[admin-api]", error);
  return NextResponse.json(
    { error: "কাজটি সম্পন্ন করা যায়নি" },
    { status: 500 },
  );
}

export function validationError(message: string): Error {
  const err = new Error(message);
  err.name = "ValidationError";
  return err;
}
