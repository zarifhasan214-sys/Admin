import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { requireAdminPage } from "@/lib/admin-guard";
import { getDashboardStats } from "@/lib/admin-stats";
import { getLang } from "@/lib/lang";
import { permissionsFor } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Admin Console · Manirampur Blood Network",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();
  const lang = await getLang();
  const stats = await getDashboardStats();
  const alerts =
    stats.pendingDonorVerification + stats.pendingRequests + stats.openReports;

  return (
    <AdminShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      permissions={permissionsFor(user.role)}
      lang={lang}
      unreadAlerts={alerts}
    >
      {children}
    </AdminShell>
  );
}
