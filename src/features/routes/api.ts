"use client";

import { z } from "zod";

import type { DashboardRoute } from "@/features/routes/schemas";
import { dashboardRouteSchema } from "@/features/routes/schemas";
import { requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const routeAdminQueryKeys = {
  all: ["route-administration"] as const,
  list: () => ["route-administration", "list"] as const,
};

export function getRoutes() {
  return requestBackendApi(["api", "Route"], z.array(dashboardRouteSchema));
}

export function updateRoute(payload: DashboardRoute) {
  return sendBackendJson(["api", "Route"], "PUT", payload, z.unknown());
}
