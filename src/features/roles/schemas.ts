import { z } from "zod";

import { permissionSchema, roleSchema, routeSchema } from "@/features/auth/schemas";

const roleNamePattern = /^[^!#$%^&*(){}[\]:;<>,?~\\/]+$/;

export const dashboardRoleSchema = roleSchema;
export type DashboardRole = z.infer<typeof dashboardRoleSchema>;

export const roleMutationSchema = z.object({
  id: z.number().int().nonnegative(),
  idUserCreated: z.number().int().nonnegative().optional(),
  idUserUpdated: z.number().int().nonnegative().optional(),
  permissions: z.array(permissionSchema),
  role: z.string().trim().min(1),
  routes: z.array(routeSchema),
  userCreated: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
});
export type RoleMutation = z.infer<typeof roleMutationSchema>;

export const roleEditorFormSchema = z.object({
  permissionIds: z.array(z.string()),
  role: z.string().trim().min(1, "El nombre del rol es obligatorio.").regex(roleNamePattern, "El nombre contiene caracteres no permitidos."),
  routeIds: z.array(z.string()),
});
export type RoleEditorFormValues = z.infer<typeof roleEditorFormSchema>;
