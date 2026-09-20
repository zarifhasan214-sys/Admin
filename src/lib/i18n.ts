export type Lang = "bn" | "en";

type Entry = { bn: string; en: string };

export const dict = {
  appName: { bn: "মানিরামপুর ব্লাড নেটওয়ার্ক", en: "Manirampur Blood Network" },
  adminConsole: { bn: "অ্যাডমিন কনসোল", en: "Admin Console" },
  overview: { bn: "সংক্ষিপ্ত চিত্র", en: "Overview" },
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  management: { bn: "ব্যবস্থাপনা", en: "Management" },
  users: { bn: "ব্যবহারকারী", en: "Users" },
  donors: { bn: "রক্তদাতা", en: "Donors" },
  requests: { bn: "রক্তের অনুরোধ", en: "Blood Requests" },
  responses: { bn: "ডোনার সাড়া", en: "Donor Responses" },
  donations: { bn: "রক্তদান", en: "Donations" },
  moderation: { bn: "মডারেশন", en: "Moderation" },
  verification: { bn: "যাচাই", en: "Verification Queue" },
  reports: { bn: "রিপোর্ট", en: "Reports" },
  suspended: { bn: "স্থগিত অ্যাকাউন্ট", en: "Suspended Accounts" },
  operations: { bn: "পরিচালনা", en: "Operations" },
  emergencyContacts: { bn: "জরুরি যোগাযোগ", en: "Emergency Contacts" },
  locations: { bn: "লোকেশন", en: "Locations" },
  eligibility: { bn: "যোগ্যতার নিয়ম", en: "Eligibility Rules" },
  notifications: { bn: "নোটিফিকেশন", en: "Notifications" },
  analyticsGroup: { bn: "বিশ্লেষণ", en: "Analytics" },
  analytics: { bn: "বিশ্লেষণ ও রিপোর্ট", en: "Analytics & Reports" },
  system: { bn: "সিস্টেম", en: "System" },
  auditLogs: { bn: "সিস্টেম লগ", en: "Audit Logs" },
  admins: { bn: "অ্যাডমিন ও রোল", en: "Admins & Roles" },
  settings: { bn: "সিস্টেম সেটিংস", en: "System Settings" },
  emailOutbox: { bn: "ইমেইল আউটবক্স", en: "Email Outbox" },
  search: { bn: "খুঁজুন", en: "Search" },
  logout: { bn: "লগ আউট", en: "Log out" },
  loading: { bn: "লোড হচ্ছে…", en: "Loading…" },
  noData: { bn: "কোনো তথ্য পাওয়া যায়নি", en: "No data found" },
  loadError: {
    bn: "ডেটা লোড করা সম্ভব হয়নি। আবার চেষ্টা করুন।",
    en: "Could not load data. Please try again.",
  },
  retry: { bn: "আবার চেষ্টা করুন", en: "Retry" },
  success: { bn: "সফলভাবে সম্পন্ন হয়েছে", en: "Completed successfully" },
  failure: { bn: "কাজটি সম্পন্ন করা যায়নি", en: "The action could not be completed" },
  confirm: { bn: "নিশ্চিত করুন", en: "Confirm" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  filters: { bn: "ফিল্টার", en: "Filters" },
  clearFilters: { bn: "ফিল্টার মুছুন", en: "Clear filters" },
  apply: { bn: "প্রয়োগ", en: "Apply" },
  export: { bn: "এক্সপোর্ট (CSV)", en: "Export (CSV)" },
  attention: { bn: "যা মনোযোগ প্রয়োজন", en: "Attention required" },
  recentActivity: { bn: "সাম্প্রতিক কার্যক্রম", en: "Recent activity" },
  review: { bn: "রিভিউ", en: "Review" },
  welcome: { bn: "স্বাগতম", en: "Welcome" },
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}

/** Bilingual inline label: Bengali primary with English support. */
export function bi(key: DictKey, lang: Lang): string {
  return lang === "bn" ? dict[key].bn : dict[key].en;
}

export const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
}

export function fmtNumber(value: number, lang: Lang): string {
  const s = new Intl.NumberFormat("en-US").format(value);
  return lang === "bn" ? toBnDigits(s) : s;
}

export function fmtDate(
  value: Date | string | null | undefined,
  lang: Lang,
  withTime = false,
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const out = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Dhaka",
  }).format(d);
  return out;
}
