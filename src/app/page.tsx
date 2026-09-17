import { redirect } from "next/navigation";

import { getDashboardToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const token = await getDashboardToken();
  redirect(token ? "/dashboard" : "/login");
}
