import { z } from "zod";

const optionalString = z.string().nullable().optional();

export const alertDefinitionSchema = z.object({
  description: z.string(),
  id: z.number().int().positive(),
});

export const subscriptionSchema = z
  .object({
    alert: optionalString,
    dateCreated: optionalString,
    dateUpdated: optionalString,
    email: z.string(),
    id: z.number().int().nonnegative(),
    idAlert: z.number().int().positive(),
    idPayPad: z.number().int().positive(),
    idUserCreated: z.number().int().optional(),
    idUserUpdated: z.number().int().optional(),
    paypad: optionalString,
    userCreated: optionalString,
    userUpdated: optionalString,
  })
  .passthrough();
export type AlertSubscription = z.infer<typeof subscriptionSchema>;

export const subscriptionCreateSchema = z.object({
  alert: z.string().trim().min(1),
  email: z.string(),
  idAlert: z.number().int().positive(),
  idPayPad: z.number().int().positive(),
  paypad: z.string().trim().min(1),
});
export type AlertSubscriptionCreate = z.infer<typeof subscriptionCreateSchema>;

export const subscriptionFormSchema = z.object({
  email: z.string(),
  idAlert: z.string().regex(/^\d+$/, "Selecciona una alerta."),
});
export type AlertSubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

export const alertDefinitions = [{ description: "Alerta de escasez en baúles", id: 1 }] as const satisfies readonly z.infer<typeof alertDefinitionSchema>[];
