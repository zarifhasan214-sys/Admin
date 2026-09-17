import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ---------------------------------- enums --------------------------------- */

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "SUPPORT",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
  "DELETION_REQUESTED",
]);

export const bloodGroupEnum = pgEnum("blood_group", [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);

export const availabilityEnum = pgEnum("availability", [
  "AVAILABLE",
  "TEMPORARILY_UNAVAILABLE",
  "NOT_AVAILABLE",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "UNVERIFIED",
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "PENDING_REVIEW",
  "VERIFIED",
  "SEARCHING_FOR_DONOR",
  "DONOR_CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const requestUrgencyEnum = pgEnum("request_urgency", [
  "ROUTINE",
  "URGENT",
  "CRITICAL",
]);

export const donorRequestStatusEnum = pgEnum("donor_request_status", [
  "NOTIFIED",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "WITHDRAWN",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
  "DISMISSED",
]);

export const reportPriorityEnum = pgEnum("report_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
]);

export const locationTypeEnum = pgEnum("location_type", [
  "DISTRICT",
  "UPAZILA",
  "UNION",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "PENDING",
  "DELIVERED",
  "FAILED",
]);

/* ---------------------------------- users --------------------------------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("email", { length: 200 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    phone: varchar("language", { length: 8 }),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    emailVerified: boolean("email_verified").notNull().default(false),
    statusReason: text("language"),
    statusChangedAt: timestamp("created_at", { withTimezone: true }),
    statusChangedBy: integer("id"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    preferredLanguage: varchar("language", { length: 8 })
      .notNull()
      .default("bn"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_role_idx").on(t.role),
    index("users_status_idx").on(t.status),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

/* -------------------------------- locations ------------------------------- */

export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    type: locationTypeEnum("type").notNull(),
    parentId: integer("parent_id"),
    nameBn: varchar("name_bn", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    sourceUrl: text("source_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("locations_unique_name").on(t.type, t.parentId, t.nameEn),
    index("locations_type_idx").on(t.type),
  ],
);

/* ------------------------------ donor profiles ---------------------------- */

export const donorProfiles = pgTable(
  "donor_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    gender: genderEnum("gender").notNull(),
    dateOfBirth: date("date_of_birth"),
    weightKg: integer("weight_kg"),
    phone: varchar("phone", { length: 32 }),
    district: varchar("district", { length: 120 }),
    upazila: varchar("upazila", { length: 120 }),
    unionName: varchar("union_name", { length: 120 }),
    area: varchar("area", { length: 200 }),
    photoUrl: text("photo_url"),
    availability: availabilityEnum("availability_status")
      .notNull()
      .default("AVAILABLE"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    verificationNote: text("verification_note"),
    verifiedBy: integer("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    donationCount: integer("donation_count").notNull().default(0),
    lastDonationDate: date("last_donation_date"),
    isSearchable: boolean("searchable").notNull().default(true),
    profileCompletion: integer("profile_completion").notNull().default(0),
    healthNotesPrivate: text("health_notes_private"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_profiles_user_unique").on(t.userId),
    index("donor_profiles_group_idx").on(t.bloodGroup),
    index("donor_profiles_verif_idx").on(t.verificationStatus),
    index("donor_profiles_avail_idx").on(t.availability),
  ],
);

/* ------------------------------ blood requests ---------------------------- */

export const bloodRequests = pgTable(
  "blood_requests",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientName: varchar("patient_name", { length: 160 }).notNull(),
    patientAge: integer("patient_age"),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    unitsRequired: integer("units_required").notNull().default(1),
    hospitalName: varchar("hospital", { length: 200 }).notNull(),
    hospitalAddress: text("location_text"),
    district: varchar("district", { length: 120 }),
    upazila: varchar("upazila", { length: 120 }),
    unionName: varchar("union_name", { length: 120 }),
    requiredDate: date("required_date").notNull(),
    urgency: requestUrgencyEnum("urgency").notNull().default("ROUTINE"),
    contactName: varchar("contact_name", { length: 160 }),
    contactPhone: varchar("contact_phone", { length: 32 }).notNull(),
    description: text("description"),
    proofDocumentUrl: text("proof_document_url"),
    status: requestStatusEnum("status").notNull().default("PENDING_REVIEW"),
    statusNote: text("status_note"),
    verifiedBy: integer("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("blood_requests_status_idx").on(t.status),
    index("blood_requests_urgency_idx").on(t.urgency),
    index("blood_requests_group_idx").on(t.bloodGroup),
    index("blood_requests_created_idx").on(t.createdAt),
  ],
);

export const donorResponses = pgTable(
  "donor_responses",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => bloodRequests.id, { onDelete: "cascade" }),
    donorId: integer("donor_id")
      .notNull()
      .references(() => donorProfiles.id, { onDelete: "cascade" }),
    status: donorRequestStatusEnum("status").notNull().default("NOTIFIED"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    contactPermission: boolean("contact_permission").notNull().default(false),
    contactUnlockedAt: timestamp("contact_unlocked_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("donor_responses_request_idx").on(t.requestId),
    index("donor_responses_donor_idx").on(t.donorId),
  ],
);

export const donations = pgTable(
  "donations",
  {
    id: serial("id").primaryKey(),
    donorId: integer("donor_id")
      .notNull()
      .references(() => donorProfiles.id, { onDelete: "cascade" }),
    requestId: integer("request_id").references(() => bloodRequests.id, {
      onDelete: "set null",
    }),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    donationDate: date("donation_date").notNull(),
    locationName: varchar("location_name", { length: 200 }),
    district: varchar("district", { length: 120 }),
    upazila: varchar("upazila", { length: 120 }),
    notes: text("notes"),
    ruleVersion: varchar("rule_version", { length: 40 }),
    recordedBy: integer("recorded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("donations_donor_idx").on(t.donorId),
    index("donations_date_idx").on(t.donationDate),
  ],
);

/* --------------------------------- reports -------------------------------- */

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetType: varchar("target_type", { length: 40 }).notNull(),
    targetId: integer("target_id").notNull(),
    reason: varchar("reason", { length: 200 }).notNull(),
    description: text("description"),
    priority: reportPriorityEnum("priority").notNull().default("NORMAL"),
    status: reportStatusEnum("status").notNull().default("PENDING"),
    assignedTo: integer("assigned_to"),
    resolutionNote: text("resolution_note"),
    resolvedBy: integer("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_priority_idx").on(t.priority),
  ],
);

/* --------------------------- emergency contacts --------------------------- */

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: serial("id").primaryKey(),
    nameBn: varchar("name_bn", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    organization: varchar("organization", { length: 200 }),
    phone: varchar("phone", { length: 40 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 40 }),
    address: text("address"),
    category: varchar("category", { length: 60 }).notNull(),
    sourceUrl: text("source_url"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("emergency_contacts_category_idx").on(t.category)],
);

/* ---------------------------- eligibility rules --------------------------- */

export const eligibilityRules = pgTable(
  "eligibility_rules",
  {
    id: serial("id").primaryKey(),
    version: varchar("version", { length: 40 }).notNull(),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    minWeightKg: integer("min_weight_kg").notNull(),
    defaultIntervalDays: integer("default_interval_days").notNull(),
    maleIntervalDays: integer("male_interval_days").notNull(),
    femaleIntervalDays: integer("female_interval_days").notNull(),
    temporaryDeferralRules: jsonb("temporary_deferral_rules"),
    effectiveFrom: date("effective_from").notNull(),
    source: text("source"),
    isActive: boolean("is_active").notNull().default(false),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("eligibility_rules_version_unique").on(t.version)],
);

/* ------------------------------ notifications ----------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    titleBn: varchar("title_bn", { length: 200 }).notNull(),
    titleEn: varchar("title_en", { length: 200 }).notNull(),
    bodyBn: text("body_bn"),
    bodyEn: text("body_en"),
    link: text("link"),
    type: varchar("type", { length: 40 }).notNull().default("ANNOUNCEMENT"),
    isRead: boolean("is_read").notNull().default(false),
    broadcastId: varchar("broadcast_id", { length: 64 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_broadcast_idx").on(t.broadcastId),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  announcements: boolean("announcements").notNull().default(true),
  requestAlerts: boolean("request_alerts").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
});

/* -------------------------------- audit logs ------------------------------ */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id"),
    actorName: varchar("actor_name", { length: 160 }),
    actorRole: userRoleEnum("actor_role"),
    action: varchar("action", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 60 }).notNull(),
    resourceId: varchar("resource_id", { length: 60 }),
    previousState: jsonb("previous_state"),
    newState: jsonb("new_state"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_resource_idx").on(t.resourceType),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------- email outbox ----------------------------- */

export const emailOutbox = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  recipient: varchar("recipient", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 250 }).notNull(),
  template: varchar("template", { length: 80 }).notNull(),
  status: emailStatusEnum("status").notNull().default("PENDING"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ----------------------------- system settings ---------------------------- */

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type DonorProfile = typeof donorProfiles.$inferSelect;
export type BloodRequest = typeof bloodRequests.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
