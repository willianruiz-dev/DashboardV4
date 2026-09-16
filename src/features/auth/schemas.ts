import { z } from "zod";

import { httpEnvelopeSchema } from "@/schemas/http";

const legacyUsernameForbiddenCharacters = /[!#$%^&*(){}[\]:;<>,?~='\\/]/;

export const loginRequestSchema = z.object({
  password: z.string().min(1, "La contraseña es obligatoria."),
  userName: z
    .string()
    .trim()
    .min(1, "El usuario es obligatorio.")
    .refine(
      (value) => !legacyUsernameForbiddenCharacters.test(value),
      "No se permiten carácteres especiales.",
    ),
});

export const permissionSchema = z.object({
  dateCreated: z.string().nullable().optional(),
  dateUpdated: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  id: z.number().int(),
  idUserCreated: z.number().int().optional(),
  idUserUpdated: z.number().int().optional(),
  name: z.string().nullable().optional(),
  userCreated: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
});

export const routeSchema = z.object({
  dateCreated: z.string().nullable().optional(),
  dateUpdated: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  id: z.number().int(),
  idFather: z.number().int().nullable().optional(),
  idUserCreated: z.number().int().optional(),
  idUserUpdated: z.number().int().optional(),
  route: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  userCreated: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
});

export const userSchema = z.object({
  client: z.string().nullable().optional(),
  dateCreated: z.string().nullable().optional(),
  dateUpdated: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  id: z.number().int(),
  idClient: z.number().int().nullable().optional(),
  idRole: z.number().int(),
  idTypeDocument: z.number().int(),
  idUserCreated: z.number().int().optional(),
  idUserUpdated: z.number().int().optional(),
  img: z.string().nullable().optional(),
  imgExt: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  status: z.number().int(),
  typeDocument: z.string().nullable().optional(),
  userCreated: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
});

export const roleSchema = z.object({
  dateCreated: z.string().nullable().optional(),
  dateUpdated: z.string().nullable().optional(),
  id: z.number().int(),
  idUserCreated: z.number().int().optional(),
  idUserUpdated: z.number().int().optional(),
  permissions: z.array(permissionSchema).default([]),
  role: z.string().nullable().optional(),
  routes: z.array(routeSchema).default([]),
  userCreated: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
});

export const loginResponseSchema = httpEnvelopeSchema(z.string());
export const logoutResponseSchema = httpEnvelopeSchema(z.boolean());
export const currentUserResponseSchema = httpEnvelopeSchema(userSchema);
export const roleResponseSchema = httpEnvelopeSchema(roleSchema);

export const dashboardSessionSchema = z.object({
  permissions: z.array(permissionSchema),
  role: roleSchema,
  routes: z.array(routeSchema),
  user: userSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type RouteDefinition = z.infer<typeof routeSchema>;
export type User = z.infer<typeof userSchema>;
export type Role = z.infer<typeof roleSchema>;
export type DashboardSession = z.infer<typeof dashboardSessionSchema>;
