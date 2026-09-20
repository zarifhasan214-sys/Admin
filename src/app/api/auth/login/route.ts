import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "ইমেইল ও পাসওয়ার্ড দিন" },
        { status: 400 },
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "ইমেইল বা পাসওয়ার্ড সঠিক নয়" },
        { status: 401 },
      );
    }
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "এই অ্যাকাউন্টটি সক্রিয় নয়" },
        { status: 403 },
      );
    }

    await createSession(user.id);
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "কাজটি সম্পন্ন করা যায়নি" }, { status: 500 });
  }
}
