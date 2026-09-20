import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get("mbn_lang")?.value === "en" ? "en" : "bn";
}
