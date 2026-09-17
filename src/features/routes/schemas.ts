import { z } from "zod";

import { routeSchema } from "@/features/auth/schemas";

export const dashboardRouteSchema = routeSchema;
export type DashboardRoute = z.infer<typeof dashboardRouteSchema>;

export const routeIconFormSchema = z.object({
  icon: z.string().trim().min(1, "El icono es obligatorio."),
});
export type RouteIconFormValues = z.infer<typeof routeIconFormSchema>;
