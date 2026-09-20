import type { UserRole } from "@/db/schema";

export const ADMIN_ROLES: UserRole[] = [
  "SUPPORT",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
];

export const ROLE_LEVEL: Record<UserRole, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/** Every permission used across the admin console. */
export type Permission =
  | "view:dashboard"
  | "view:users"
  | "view:donors"
  | "view:requests"
  | "view:responses"
  | "view:donations"
  | "view:reports"
  | "view:analytics"
  | "view:audit"
  | "view:outbox"
  | "view:health_notes"
  | "moderate:donors"
  | "moderate:reports"
  | "moderate:accounts"
  | "moderate:requests"
  | "manage:users"
  | "manage:donations"
  | "manage:emergency_contacts"
  | "manage:locations"
  | "manage:eligibility"
  | "manage:notifications"
  | "manage:settings"
  | "export:data"
  | "manage:admins";

const SUPPORT_PERMS: Permission[] = [
  "view:dashboard",
  "view:users",
  "view:donors",
  "view:requests",
  "view:responses",
  "view:donations",
  "view:reports",
  "view:analytics",
];

const MODERATOR_PERMS: Permission[] = [
  ...SUPPORT_PERMS,
  "moderate:donors",
  "moderate:reports",
  "moderate:accounts",
  "moderate:requests",
  "view:audit",
];

const ADMIN_PERMS: Permission[] = [
  ...MODERATOR_PERMS,
  "manage:users",
  "manage:donations",
  "manage:emergency_contacts",
  "manage:locations",
  "manage:eligibility",
  "manage:notifications",
  "manage:settings",
  "view:outbox",
  "view:health_notes",
  "export:data",
];

const SUPER_ADMIN_PERMS: Permission[] = [...ADMIN_PERMS, "manage:admins"];

const MATRIX: Record<UserRole, Permission[]> = {
  USER: [],
  SUPPORT: SUPPORT_PERMS,
  MODERATOR: MODERATOR_PERMS,
  ADMIN: ADMIN_PERMS,
  SUPER_ADMIN: SUPER_ADMIN_PERMS,
};

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function can(role: UserRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: UserRole): Permission[] {
  return MATRIX[role];
}
