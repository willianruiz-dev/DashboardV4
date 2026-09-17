"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getRoutes, routeAdminQueryKeys, updateRoute } from "@/features/routes/api";
import type { DashboardRoute } from "@/features/routes/schemas";

export function useAdminRoutes(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getRoutes,
    queryKey: routeAdminQueryKeys.list(),
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DashboardRoute) => updateRoute(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: routeAdminQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-session"] });
    },
  });
}
