"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { DashboardSession } from "@/features/auth/schemas";

const DashboardSessionContext = createContext<DashboardSession | null>(null);

export function DashboardSessionProvider({ children, session }: { children: ReactNode; session: DashboardSession }) {
  return <DashboardSessionContext.Provider value={session}>{children}</DashboardSessionContext.Provider>;
}

export function useDashboardSession(): DashboardSession {
  const session = useContext(DashboardSessionContext);

  if (!session) {
    throw new Error("useDashboardSession must be used within DashboardSessionProvider.");
  }

  return session;
}

export function hasPermission(session: DashboardSession, permissionName: string): boolean {
  return session.permissions.some((permission) => permission.name === permissionName);
}
