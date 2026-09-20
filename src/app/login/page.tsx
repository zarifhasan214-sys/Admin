import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-xl text-white">
            ♥
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              মানিরামপুর ব্লাড নেটওয়ার্ক
            </h1>
            <p className="text-xs text-slate-500">
              Manirampur Blood Network · Admin Console
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
