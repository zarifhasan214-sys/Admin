import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError, requireAdminApi } from "@/lib/admin-guard";

export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const body = (await request.json()) as { lang?: string };
    const lang = body.lang === "en" ? "en" : "bn";
    const store = await cookies();
    store.set("mbn_lang", lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return NextResponse.json({ ok: true, lang });
  } catch (error) {
    return apiError(error);
  }
}
