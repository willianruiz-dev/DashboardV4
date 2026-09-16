import "server-only";

import { cookies } from "next/headers";

import {
  type DashboardSession,
  currentUserResponseSchema,
  dashboardSessionSchema,
  roleResponseSchema,
} from "@/features/auth/schemas";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";

const SESSION_COOKIE_NAME = "dashboard-v4-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export { SESSION_COOKIE_NAME };

function shouldUseSecureCookie(): boolean {
  return process.env.SESSION_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production";
}

export async function setDashboardSession(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: shouldUseSecureCookie(),
  });
}

export async function clearDashboardSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getDashboardToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getDashboardSession(): Promise<DashboardSession | null> {
  const token = await getDashboardToken();
  if (!token) {
    return null;
  }

  try {
    const currentUserEnvelope = await requestBackend(["api", "User", "Logged"], currentUserResponseSchema, {
      token,
    });
    const currentUser = currentUserEnvelope.response;
    const roleEnvelope = await requestBackend(["api", "Role", String(currentUser.idRole)], roleResponseSchema, {
      token,
    });

    return dashboardSessionSchema.parse({
      permissions: roleEnvelope.response.permissions,
      role: roleEnvelope.response,
      routes: roleEnvelope.response.routes,
      user: currentUser,
    });
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }

    throw error;
  }
}
