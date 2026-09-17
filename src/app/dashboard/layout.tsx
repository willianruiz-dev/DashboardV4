import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getDashboardSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const dashboardSession = await getDashboardSession();

  if (!dashboardSession) {
    redirect("/login");
  }

  return <DashboardShell session={dashboardSession}>{children}</DashboardShell>;
}
