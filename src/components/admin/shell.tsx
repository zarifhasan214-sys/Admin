"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NAV } from "@/lib/admin-nav";
import type { Permission } from "@/lib/rbac";
import type { Lang } from "@/lib/i18n";
import { RoleBadge } from "@/components/admin/ui";
import { ToastProvider } from "@/components/admin/toast";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export function AdminShell({
  user,
  permissions,
  lang,
  unreadAlerts,
  children,
}: {
  user: AdminUser;
  permissions: Permission[];
  lang: Lang;
  unreadAlerts: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => permissions.includes(i.permission)),
  })).filter((g) => g.items.length > 0);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function setLang(next: Lang) {
    await fetch("/api/admin/lang", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length > 0) router.push(`/admin/search?q=${encodeURIComponent(q)}`);
  }

  const sidebar = (
    <nav
      onClick={() => {
        setOpen(false);
        setMenu(false);
      }}
      className="flex h-full flex-col gap-1 overflow-y-auto px-3 pb-6"
    >
      {groups.map((group) => (
        <div key={group.en} className="mt-4 first:mt-2">
          <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            {lang === "bn" ? group.bn : group.en}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                      active
                        ? "bg-red-50 font-semibold text-red-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span aria-hidden className="w-4 text-center text-[13px] opacity-80">
                      {item.icon}
                    </span>
                    <span className="truncate">
                      {lang === "bn" ? item.bn : item.en}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
          <BrandBlock lang={lang} />
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
              <BrandBlock lang={lang} />
              {sidebar}
            </aside>
          </div>
        ) : null}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-5">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 lg:hidden"
              >
                ☰
              </button>

              <form onSubmit={submitSearch} className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="admin-global-search">
                  {lang === "bn" ? "খুঁজুন" : "Search"}
                </label>
                <div className="relative max-w-md">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  >
                    ⌕
                  </span>
                  <input
                    id="admin-global-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      lang === "bn"
                        ? "ব্যবহারকারী, ডোনার, অনুরোধ খুঁজুন…"
                        : "Search users, donors, requests…"
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-sm outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </form>

              <Link
                href="/admin?focus=alerts"
                className="relative hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 sm:block"
                aria-label="Alerts"
              >
                🔔
                {unreadAlerts > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white">
                    {unreadAlerts > 99 ? "99+" : unreadAlerts}
                  </span>
                ) : null}
              </Link>

              <div className="hidden overflow-hidden rounded-lg border border-slate-200 text-xs sm:flex">
                {(["bn", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1.5 font-medium transition ${
                      lang === l
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {l === "bn" ? "বাংলা" : "EN"}
                  </button>
                ))}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 py-1 pr-2 pl-1 hover:bg-slate-50"
                  aria-haspopup="menu"
                  aria-expanded={menu}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block max-w-32 truncate text-xs font-semibold text-slate-800">
                      {user.name}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {user.role.replaceAll("_", " ")}
                    </span>
                  </span>
                </button>
                {menu ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-2 pb-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                      <div className="mt-1.5">
                        <RoleBadge role={user.role} />
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 sm:hidden">
                      <div className="flex gap-1">
                        {(["bn", "en"] as const).map((l) => (
                          <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`flex-1 rounded-md border px-2 py-1 text-xs ${
                              lang === l
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 text-slate-600"
                            }`}
                          >
                            {l === "bn" ? "বাংলা" : "English"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Link
                      href="/admin/audit-logs"
                      className="mt-1 block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {lang === "bn" ? "আমার কার্যক্রম" : "My activity"}
                    </Link>
                    <button
                      onClick={logout}
                      className="mt-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      {lang === "bn" ? "লগ আউট" : "Log out"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function BrandBlock({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-lg text-white">
        ♥
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {lang === "bn" ? "মানিরামপুর ব্লাড" : "Manirampur Blood"}
        </p>
        <p className="text-[11px] text-slate-500">
          {lang === "bn" ? "অ্যাডমিন কনসোল" : "Admin Console"}
        </p>
      </div>
    </div>
  );
}
