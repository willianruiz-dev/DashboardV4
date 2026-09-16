import "server-only";

import { getDashboardToken } from "@/lib/auth/session";
import { BackendApiError } from "@/lib/server/backend-client";

export async function requireDashboardToken(): Promise<string> {
  const token = await getDashboardToken();

  if (!token) {
    throw new BackendApiError({
      message: "La sesión no está disponible.",
      status: 401,
    });
  }

  return token;
}
