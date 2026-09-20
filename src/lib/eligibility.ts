import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, eligibilityRules } from "@/db/schema";

export type EligibilityRule = typeof eligibilityRules.$inferSelect;
export type EligibilityDonor = Pick<
  typeof donorProfiles.$inferSelect,
  | "dateOfBirth"
  | "weightKg"
  | "gender"
  | "lastDonationDate"
  | "availabilityStatus"
  | "verificationStatus"
> & {
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
};

export async function getActiveRule(): Promise<EligibilityRule | null> {
  const [rule] = await db
    .select()
    .from(eligibilityRules)
    .where(eq(eligibilityRules.active, true))
    .orderBy(desc(eligibilityRules.effectiveDate))
    .limit(1);
  return rule ?? null;
}

export type EligibilityResult = {
  eligible: boolean;
  reasons: { bn: string; en: string }[];
  nextPossibleDate: string | null;
  ruleVersion: string | null;
};

export function evaluateEligibility(
  donor: EligibilityDonor,
  rule: EligibilityRule | null,
): EligibilityResult {
  const reasons: EligibilityResult["reasons"] = [];
  if (!rule) {
    return {
      eligible: false,
      reasons: [
        {
          bn: "কোনো সক্রিয় যোগ্যতার নিয়ম কনফিগার করা নেই।",
          en: "No active eligibility rule is configured.",
        },
      ],
      nextPossibleDate: null,
      ruleVersion: null,
    };
  }

  let age: number | null = null;
  if (donor.dateOfBirth) {
    const dob = new Date(donor.dateOfBirth);
    age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400_000));
    if (age < rule.minimumAge) {
      reasons.push({
        bn: `বয়স ন্যূনতম ${rule.minimumAge} বছরের কম`,
        en: `Age is below the minimum of ${rule.minimumAge} years`,
      });
    }
    if (rule.maximumAge !== null && age > rule.maximumAge) {
      reasons.push({
        bn: `বয়স সর্বোচ্চ ${rule.maximumAge} বছরের বেশি`,
        en: `Age is above the maximum of ${rule.maximumAge} years`,
      });
    }
  } else {
    reasons.push({
      bn: "জন্মতারিখ দেওয়া নেই",
      en: "Date of birth is missing",
    });
  }

  if (donor.weightKg === null) {
    reasons.push({ bn: "ওজন দেওয়া নেই", en: "Weight is missing" });
  } else if (Number(donor.weightKg) < Number(rule.minimumWeightKg)) {
    reasons.push({
      bn: `ওজন ন্যূনতম ${rule.minimumWeightKg} কেজির কম`,
      en: `Weight is below the minimum of ${rule.minimumWeightKg} kg`,
    });
  }

  const interval =
    donor.gender === "FEMALE"
      ? rule.femaleDonationIntervalDays
      : donor.gender === "MALE"
        ? rule.maleDonationIntervalDays
        : rule.defaultDonationIntervalDays;

  let nextPossibleDate: string | null = null;
  if (donor.lastDonationDate) {
    const next = new Date(donor.lastDonationDate);
    next.setDate(next.getDate() + interval);
    nextPossibleDate = next.toISOString().slice(0, 10);
    if (next.getTime() > Date.now()) {
      reasons.push({
        bn: `পরবর্তী সম্ভাব্য রক্তদানের তারিখ ${nextPossibleDate}`,
        en: `Next possible donation date is ${nextPossibleDate}`,
      });
    }
  }

  if (donor.availabilityStatus !== "AVAILABLE") {
    reasons.push({
      bn: "ডোনার বর্তমানে উপলব্ধ নন",
      en: "Donor is currently not available",
    });
  }
  if (donor.verificationStatus !== "VERIFIED") {
    reasons.push({
      bn: "ডোনার প্রোফাইল যাচাইকৃত নয়",
      en: "Donor profile is not verified",
    });
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    nextPossibleDate,
    ruleVersion: rule.ruleVersion,
  };
}
