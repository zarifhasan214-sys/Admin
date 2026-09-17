import type { Permission } from "@/lib/rbac";

export type NavItem = {
  href: string;
  bn: string;
  en: string;
  icon: string;
  permission: Permission;
  exact?: boolean;
};

export type NavGroup = {
  bn: string;
  en: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    bn: "সংক্ষিপ্ত চিত্র",
    en: "Overview",
    items: [
      {
        href: "/admin",
        bn: "ড্যাশবোর্ড",
        en: "Dashboard",
        icon: "▦",
        permission: "view:dashboard",
        exact: true,
      },
    ],
  },
  {
    bn: "ব্যবস্থাপনা",
    en: "Management",
    items: [
      { href: "/admin/users", bn: "ব্যবহারকারী", en: "Users", icon: "◔", permission: "view:users" },
      { href: "/admin/donors", bn: "রক্তদাতা", en: "Donors", icon: "♥", permission: "view:donors" },
      { href: "/admin/requests", bn: "রক্তের অনুরোধ", en: "Blood Requests", icon: "⛑", permission: "view:requests" },
      { href: "/admin/donor-responses", bn: "ডোনার সাড়া", en: "Donor Responses", icon: "⇄", permission: "view:responses" },
      { href: "/admin/donations", bn: "রক্তদান", en: "Donations", icon: "◉", permission: "view:donations" },
    ],
  },
  {
    bn: "মডারেশন",
    en: "Moderation",
    items: [
      { href: "/admin/verification", bn: "যাচাই কিউ", en: "Verification Queue", icon: "✓", permission: "view:donors" },
      { href: "/admin/reports", bn: "রিপোর্ট", en: "Reports", icon: "⚑", permission: "view:reports" },
      { href: "/admin/suspended", bn: "স্থগিত অ্যাকাউন্ট", en: "Suspended Accounts", icon: "⃠", permission: "view:users" },
    ],
  },
  {
    bn: "পরিচালনা",
    en: "Operations",
    items: [
      { href: "/admin/emergency-contacts", bn: "জরুরি যোগাযোগ", en: "Emergency Contacts", icon: "☎", permission: "view:dashboard" },
      { href: "/admin/locations", bn: "লোকেশন", en: "Locations", icon: "⌖", permission: "view:dashboard" },
      { href: "/admin/eligibility-rules", bn: "যোগ্যতার নিয়ম", en: "Eligibility Rules", icon: "☰", permission: "view:dashboard" },
      { href: "/admin/notifications", bn: "নোটিফিকেশন", en: "Notifications", icon: "🔔", permission: "view:dashboard" },
      { href: "/admin/email-outbox", bn: "ইমেইল আউটবক্স", en: "Email Outbox", icon: "✉", permission: "view:outbox" },
    ],
  },
  {
    bn: "বিশ্লেষণ",
    en: "Analytics",
    items: [
      { href: "/admin/analytics", bn: "বিশ্লেষণ ও রিপোর্ট", en: "Analytics & Reports", icon: "▤", permission: "view:analytics" },
    ],
  },
  {
    bn: "সিস্টেম",
    en: "System",
    items: [
      { href: "/admin/audit-logs", bn: "সিস্টেম লগ", en: "Audit Logs", icon: "⎘", permission: "view:audit" },
      { href: "/admin/admins", bn: "অ্যাডমিন ও রোল", en: "Admins & Roles", icon: "⚿", permission: "manage:admins" },
      { href: "/admin/settings", bn: "সিস্টেম সেটিংস", en: "System Settings", icon: "⚙", permission: "manage:settings" },
    ],
  },
];
