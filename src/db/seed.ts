import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { db, pool } from "./index";
import {
  auditLogs,
  bloodRequests,
  donations,
  donorProfiles,
  donorResponses,
  eligibilityRules,
  emailOutbox,
  emergencyContacts,
  locations,
  notificationPreferences,
  notifications,
  reports,
  systemSettings,
  users,
} from "./schema";
import { hashPassword } from "../lib/auth";

const SOURCE_UNION =
  "https://manirampur.jashore.gov.bd/bn/site/page/union-parishad-list";

const UNIONS = [
  ["ভোজগাতী", "Bhojgati"],
  ["দূর্বাডাঙ্গা", "Durbadanga"],
  ["হরিদাসকাটি", "Haridaskati"],
  ["হরিহরনগর", "Hariharnagar"],
  ["ঝাঁপা", "Jhanpa"],
  ["কাশিমনগর", "Kashimnagar"],
  ["খানপুর", "Khanpur"],
  ["খেদাপাড়া", "Khedapara"],
  ["কুলটিয়া", "Kultia"],
  ["মনোহরপুর", "Monoharpur"],
  ["মশ্মিমনগর", "Maswimnagar"],
  ["নেহালপুর", "Nehalpur"],
  ["রোহিতা", "Rohita"],
  ["শ্যামকুড়", "Shyamkur"],
  ["চালুয়াহাটী", "Chaluahati"],
  ["ঢাকুরিয়া", "Dhakuria"],
  ["দৌলতপুর", "Doulatpur"],
] as const;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Seeding Manirampur Blood Network…");

  // wipe operational data (idempotent re-seed)
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, notifications, notification_preferences, donor_responses,
    donations, reports, blood_requests, donor_profiles, sessions, users,
    locations, emergency_contacts, eligibility_rules, email_outbox, system_settings
    RESTART IDENTITY CASCADE`);

  /* -------------------------------- locations ------------------------------- */
  const [district] = await db
    .insert(locations)
    .values({
      type: "DISTRICT",
      nameBn: "যশোর",
      nameEn: "Jashore",
      sourceUrl: "https://jashore.gov.bd/",
    })
    .returning();

  const [upazila] = await db
    .insert(locations)
    .values({
      type: "UPAZILA",
      parentId: district!.id,
      nameBn: "মনিরামপুর",
      nameEn: "Manirampur",
      sourceUrl: "https://manirampur.jashore.gov.bd/",
    })
    .returning();

  await db.insert(locations).values(
    UNIONS.map(([bn, en]) => ({
      type: "UNION" as const,
      parentId: upazila!.id,
      nameBn: bn,
      nameEn: en,
      sourceUrl: SOURCE_UNION,
    })),
  );

  /* ---------------------------- eligibility rules --------------------------- */
  await db.insert(eligibilityRules).values([
    {
      version: "2023.1",
      minAge: 18,
      maxAge: 60,
      minWeightKg: 48,
      defaultIntervalDays: 120,
      maleIntervalDays: 90,
      femaleIntervalDays: 120,
      temporaryDeferralRules: {
        afterFever: 14,
        afterAntibiotics: 7,
        afterMinorSurgery: 180,
        afterPregnancy: 365,
      },
      effectiveFrom: "2023-01-01",
      source:
        "Safe Blood Transfusion Programme, DGHS Bangladesh (operational configuration)",
      isActive: false,
    },
    {
      version: "2025.1",
      minAge: 18,
      maxAge: 60,
      minWeightKg: 50,
      defaultIntervalDays: 120,
      maleIntervalDays: 90,
      femaleIntervalDays: 120,
      temporaryDeferralRules: {
        afterFever: 14,
        afterAntibiotics: 7,
        afterMinorSurgery: 180,
        afterPregnancy: 365,
        afterTattoo: 365,
      },
      effectiveFrom: "2025-01-01",
      source:
        "Safe Blood Transfusion Programme, DGHS Bangladesh (operational configuration)",
      isActive: true,
    },
  ]);

  /* --------------------------- emergency contacts --------------------------- */
  await db.insert(emergencyContacts).values([
    {
      nameBn: "জাতীয় জরুরি সেবা",
      nameEn: "National Emergency Service",
      organization: "Government of Bangladesh",
      phone: "999",
      category: "EMERGENCY",
      sourceUrl: "https://999.gov.bd/",
      lastVerifiedAt: daysAgo(20),
      isActive: true,
    },
    {
      nameBn: "স্বাস্থ্য বাতায়ন",
      nameEn: "Shastho Batayon",
      organization: "DGHS",
      phone: "16263",
      category: "HEALTHLINE",
      sourceUrl: "https://dghs.gov.bd/",
      lastVerifiedAt: daysAgo(20),
      isActive: true,
    },
    {
      nameBn: "মনিরামপুর উপজেলা স্বাস্থ্য কমপ্লেক্স",
      nameEn: "Manirampur Upazila Health Complex",
      organization: "DGHS",
      phone: "02477762224",
      address: "Manirampur, Jashore",
      category: "HOSPITAL",
      sourceUrl: "https://manirampur.jashore.gov.bd/",
      lastVerifiedAt: daysAgo(45),
      isActive: true,
    },
    {
      nameBn: "যশোর ২৫০ শয্যা জেনারেল হাসপাতাল",
      nameEn: "Jashore 250 Bed General Hospital",
      organization: "DGHS",
      phone: "02477765077",
      address: "Jashore Sadar, Jashore",
      category: "HOSPITAL",
      sourceUrl: "https://jashore.gov.bd/",
      lastVerifiedAt: daysAgo(60),
      isActive: true,
    },
    {
      nameBn: "বাংলাদেশ রেড ক্রিসেন্ট সোসাইটি (রক্ত কেন্দ্র)",
      nameEn: "Bangladesh Red Crescent Society Blood Centre",
      organization: "BDRCS",
      phone: "0255201268",
      address: "Mohammadpur, Dhaka",
      category: "BLOOD_BANK",
      sourceUrl: "https://bdrcs.org/",
      lastVerifiedAt: daysAgo(90),
      isActive: true,
    },
  ]);

  /* ---------------------------------- users --------------------------------- */
  const pwd = hashPassword("Admin@12345");

  const staff = await db
    .insert(users)
    .values([
      {
        name: "Nayeem Hasan",
        email: "superadmin@mbn.test",
        phone: "01700000001",
        passwordHash: pwd,
        role: "SUPER_ADMIN" as const,
        emailVerified: true,
        lastLoginAt: daysAgo(0),
      },
      {
        name: "Rokeya Sultana",
        email: "admin@mbn.test",
        phone: "01700000002",
        passwordHash: pwd,
        role: "ADMIN" as const,
        emailVerified: true,
        lastLoginAt: daysAgo(1),
      },
      {
        name: "Imran Kabir",
        email: "moderator@mbn.test",
        phone: "01700000003",
        passwordHash: pwd,
        role: "MODERATOR" as const,
        emailVerified: true,
        lastLoginAt: daysAgo(2),
      },
      {
        name: "Sadia Afrin",
        email: "support@mbn.test",
        phone: "01700000004",
        passwordHash: pwd,
        role: "SUPPORT" as const,
        emailVerified: true,
        lastLoginAt: daysAgo(3),
      },
    ])
    .returning();

  const superAdmin = staff[0]!;
  const admin = staff[1]!;
  const moderator = staff[2]!;

  const firstNames = [
    "Rafiq",
    "Sumaiya",
    "Jahid",
    "Mitu",
    "Arif",
    "Nusrat",
    "Sabbir",
    "Tanjina",
    "Rasel",
    "Farhana",
    "Mizanur",
    "Shirin",
    "Alamgir",
    "Rumana",
    "Shohag",
    "Lamia",
  ];
  const lastNames = [
    "Hossain",
    "Akter",
    "Islam",
    "Khatun",
    "Rahman",
    "Jahan",
    "Ahmed",
    "Sultana",
  ];

  const memberValues = Array.from({ length: 64 }, (_, i) => {
    const name = `${pick(firstNames, i)} ${pick(lastNames, i * 3 + 1)}`;
    const status =
      i % 23 === 0
        ? ("SUSPENDED" as const)
        : i % 31 === 0
          ? ("DEACTIVATED" as const)
          : ("ACTIVE" as const);
    return {
      name,
      email: `member${i + 1}@mbn.test`,
      phone: `018${String(10000000 + i * 137).slice(0, 8)}`,
      passwordHash: pwd,
      role: "USER" as const,
      status,
      statusReason:
        status === "SUSPENDED" ? "Repeated unverified blood requests" : null,
      statusChangedAt: status === "ACTIVE" ? null : daysAgo(i % 30),
      statusChangedBy: status === "ACTIVE" ? null : moderator.id,
      emailVerified: i % 7 !== 0,
      lastLoginAt: i % 5 === 0 ? null : daysAgo(i % 25),
      createdAt: daysAgo(330 - i * 5),
      updatedAt: daysAgo(i % 40),
    };
  });

  const members = await db.insert(users).values(memberValues).returning();

  await db.insert(notificationPreferences).values(
    [...staff, ...members].map((u) => ({ userId: u.id })),
  );

  /* ------------------------------ donor profiles ---------------------------- */
  const donorValues = members.slice(0, 46).map((u, i) => {
    const verification =
      i % 9 === 0
        ? ("PENDING_REVIEW" as const)
        : i % 11 === 0
          ? ("REJECTED" as const)
          : i % 17 === 0
            ? ("UNVERIFIED" as const)
            : i % 23 === 0
              ? ("SUSPENDED" as const)
              : ("VERIFIED" as const);
    const availability =
      i % 6 === 0
        ? ("TEMPORARILY_UNAVAILABLE" as const)
        : i % 13 === 0
          ? ("NOT_AVAILABLE" as const)
          : ("AVAILABLE" as const);
    const donationCount = i % 7;
    return {
      userId: u.id,
      bloodGroup: pick(BLOOD_GROUPS, i * 3),
      gender: i % 3 === 0 ? ("FEMALE" as const) : ("MALE" as const),
      dateOfBirth: isoDate(daysAgo(365 * (19 + (i % 30)) + i)),
      weightKg: 50 + (i % 25),
      phone: u.phone,
      district: "Jashore",
      upazila: "Manirampur",
      unionName: pick(UNIONS, i)[1],
      area: `Ward ${1 + (i % 9)}`,
      availability,
      verificationStatus: verification,
      verifiedBy: verification === "VERIFIED" ? moderator.id : null,
      verifiedAt: verification === "VERIFIED" ? daysAgo(40 - (i % 30)) : null,
      verificationNote:
        verification === "REJECTED" ? "Submitted documents unreadable" : null,
      donationCount,
      lastDonationDate:
        donationCount > 0 ? isoDate(daysAgo(30 + (i % 200))) : null,
      isSearchable: verification === "VERIFIED" && i % 19 !== 0,
      profileCompletion: 60 + (i % 5) * 10,
      healthNotesPrivate:
        i % 8 === 0 ? "Mild anaemia reported during last screening." : null,
      createdAt: daysAgo(300 - i * 6),
      updatedAt: daysAgo(i % 30),
    };
  });

  const donors = await db.insert(donorProfiles).values(donorValues).returning();

  /* ------------------------------ blood requests ---------------------------- */
  const statuses = [
    "PENDING_REVIEW",
    "VERIFIED",
    "SEARCHING_FOR_DONOR",
    "DONOR_CONTACTED",
    "ACCEPTED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
  ] as const;
  const hospitals = [
    "Manirampur Upazila Health Complex",
    "Jashore 250 Bed General Hospital",
    "Jashore Adhunik Sadar Hospital",
    "Rajarhat Community Clinic",
  ];

  const requestValues = Array.from({ length: 52 }, (_, i) => {
    const status = i < 6 ? ("PENDING_REVIEW" as const) : pick(statuses, i * 5);
    const urgency =
      i % 9 === 0
        ? ("CRITICAL" as const)
        : i % 4 === 0
          ? ("URGENT" as const)
          : ("ROUTINE" as const);
    const created = daysAgo(150 - i * 2.5);
    return {
      requesterId: pick(members, i * 7).id,
      patientName: `${pick(firstNames, i * 5)} ${pick(lastNames, i)}`,
      patientAge: 5 + (i % 70),
      bloodGroup: pick(BLOOD_GROUPS, i * 5),
      unitsRequired: 1 + (i % 3),
      hospitalName: pick(hospitals, i),
      hospitalAddress: "Manirampur, Jashore",
      district: "Jashore",
      upazila: "Manirampur",
      unionName: pick(UNIONS, i * 2)[1],
      requiredDate: isoDate(daysAgo(150 - i * 2.5 - 3)),
      urgency,
      contactName: `${pick(firstNames, i + 2)} ${pick(lastNames, i + 4)}`,
      contactPhone: `019${String(20000000 + i * 311).slice(0, 8)}`,
      description:
        "Patient admitted for scheduled transfusion support. Attendant available at hospital.",
      status,
      verifiedBy: status === "PENDING_REVIEW" ? null : admin.id,
      verifiedAt: status === "PENDING_REVIEW" ? null : created,
      createdAt: created,
      updatedAt: created,
    };
  });

  const requests = await db
    .insert(bloodRequests)
    .values(requestValues)
    .returning();

  /* ------------------------------ donor responses --------------------------- */
  const responseStatuses = [
    "NOTIFIED",
    "ACCEPTED",
    "DECLINED",
    "COMPLETED",
    "WITHDRAWN",
  ] as const;

  const responseValues = requests.flatMap((r, i) =>
    Array.from({ length: (i % 4) + 1 }, (_, j) => {
      const status = pick(responseStatuses, i + j);
      return {
        requestId: r.id,
        donorId: pick(donors, i * 3 + j).id,
        status,
        respondedAt: status === "NOTIFIED" ? null : r.createdAt,
        contactPermission: status === "ACCEPTED" || status === "COMPLETED",
        contactUnlockedAt:
          status === "ACCEPTED" || status === "COMPLETED" ? r.createdAt : null,
        createdAt: r.createdAt,
      };
    }),
  );

  await db.insert(donorResponses).values(responseValues);

  /* -------------------------------- donations ------------------------------- */
  const donationValues = donors
    .filter((d) => d.donationCount > 0)
    .flatMap((d, i) =>
      Array.from({ length: Math.min(d.donationCount, 3) }, (_, j) => ({
        donorId: d.id,
        requestId: pick(requests, i * 2 + j).id,
        bloodGroup: d.bloodGroup,
        donationDate: isoDate(daysAgo(30 + j * 120 + (i % 40))),
        locationName: pick(hospitals, i + j),
        district: "Jashore",
        upazila: "Manirampur",
        notes: "Whole blood donation recorded by field volunteer.",
        ruleVersion: "2025.1",
        recordedBy: admin.id,
        createdAt: daysAgo(30 + j * 120 + (i % 40)),
      })),
    );

  await db.insert(donations).values(donationValues);

  /* --------------------------------- reports -------------------------------- */
  const reportStatuses = [
    "PENDING",
    "UNDER_REVIEW",
    "RESOLVED",
    "REJECTED",
    "DISMISSED",
  ] as const;
  const priorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
  const reasons = [
    "Fake blood request",
    "Unreachable donor",
    "Abusive behaviour",
    "Duplicate profile",
    "Suspicious contact information",
  ];

  await db.insert(reports).values(
    Array.from({ length: 24 }, (_, i) => {
      const status = i < 5 ? ("PENDING" as const) : pick(reportStatuses, i);
      const targetIsUser = i % 2 === 0;
      return {
        reporterId: pick(members, i * 3).id,
        targetType: targetIsUser ? "USER" : "BLOOD_REQUEST",
        targetId: targetIsUser ? pick(members, i * 5).id : pick(requests, i).id,
        reason: pick(reasons, i),
        description:
          "Reported through the public portal. Requires operational review.",
        priority: i % 7 === 0 ? ("CRITICAL" as const) : pick(priorities, i),
        status,
        assignedTo: status === "UNDER_REVIEW" ? moderator.id : null,
        resolutionNote:
          status === "RESOLVED" ? "Contacted both parties, issue closed." : null,
        resolvedBy: status === "RESOLVED" ? moderator.id : null,
        resolvedAt: status === "RESOLVED" ? daysAgo(i) : null,
        createdAt: daysAgo(60 - i * 2),
        updatedAt: daysAgo(i),
      };
    }),
  );

  /* ------------------------------ notifications ----------------------------- */
  await db.insert(notifications).values(
    members.slice(0, 20).map((u, i) => ({
      userId: u.id,
      titleBn: "নতুন রক্তের অনুরোধ",
      titleEn: "New blood request nearby",
      bodyBn: "আপনার এলাকায় একটি নতুন রক্তের অনুরোধ এসেছে।",
      bodyEn: "A new blood request has been posted in your area.",
      link: "/requests",
      type: "REQUEST_ALERT",
      isRead: i % 3 === 0,
      createdBy: admin.id,
      createdAt: daysAgo(i),
    })),
  );

  /* ------------------------------- email outbox ----------------------------- */
  await db.insert(emailOutbox).values(
    members.slice(0, 15).map((u, i) => ({
      recipient: u.email,
      subject: i % 3 === 0 ? "Verify your email" : "Blood request update",
      template: i % 3 === 0 ? "email_verification" : "request_update",
      status:
        i % 5 === 0
          ? ("FAILED" as const)
          : i % 4 === 0
            ? ("PENDING" as const)
            : ("DELIVERED" as const),
      error: i % 5 === 0 ? "SMTP timeout after 30s" : null,
      sentAt: i % 5 === 0 ? null : daysAgo(i),
      createdAt: daysAgo(i),
    })),
  );

  /* ----------------------------- system settings ---------------------------- */
  await db.insert(systemSettings).values([
    { key: "site_name", value: "Manirampur Blood Network" },
    { key: "default_language", value: "bn" },
    { key: "timezone", value: "Asia/Dhaka" },
    { key: "maintenance_mode", value: "false" },
    { key: "announcements_enabled", value: "true" },
    { key: "request_expiry_days", value: "7" },
    { key: "session_days", value: "7" },
    { key: "min_donation_gap_override", value: "" },
  ]);

  /* -------------------------------- audit logs ------------------------------ */
  await db.insert(auditLogs).values([
    {
      actorId: superAdmin.id,
      actorName: superAdmin.name,
      actorRole: superAdmin.role,
      action: "SYSTEM_SEED",
      resourceType: "SYSTEM",
      resourceId: "bootstrap",
      newState: { note: "Initial operational dataset loaded" },
      createdAt: daysAgo(0),
    },
    {
      actorId: moderator.id,
      actorName: moderator.name,
      actorRole: moderator.role,
      action: "DONOR_VERIFIED",
      resourceType: "DONOR",
      resourceId: String(donors[0]!.id),
      previousState: { verificationStatus: "PENDING_REVIEW" },
      newState: { verificationStatus: "VERIFIED" },
      createdAt: daysAgo(1),
    },
    {
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      action: "REQUEST_STATUS_CHANGED",
      resourceType: "BLOOD_REQUEST",
      resourceId: String(requests[0]!.id),
      previousState: { status: "PENDING_REVIEW" },
      newState: { status: "VERIFIED" },
      createdAt: daysAgo(2),
    },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
