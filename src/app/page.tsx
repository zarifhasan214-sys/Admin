import Link from "next/link";
import { db } from "@/db";
import { count, eq, and } from "drizzle-orm";
import { donorProfiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [donors] = await db
    .select({ value: count() })
    .from(donorProfiles)
    .where(
      and(
        eq(donorProfiles.verificationStatus, "VERIFIED"),
        eq(donorProfiles.isSearchable, true),
      ),
    );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-2xl text-white">
        ♥
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
        মানিরামপুর ব্লাড নেটওয়ার্ক
      </h1>
      <p className="mt-2 text-slate-600">
        Manirampur Blood Network — মানিরামপুর, যশোর এলাকার স্বেচ্ছায় রক্তদাতা ও
        রোগীর মধ্যে সংযোগ তৈরির কমিউনিটি প্ল্যাটফর্ম।
      </p>
      <p className="mt-4 text-sm text-slate-600">
        বর্তমানে{" "}
        <strong className="text-slate-900">{donors?.value ?? 0}</strong> জন
        যাচাইকৃত রক্তদাতা ডিরেক্টরিতে রয়েছেন।
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          অ্যাডমিন লগইন
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          অ্যাডমিন কনসোল
        </Link>
      </div>
    </main>
  );
}
