import { z } from "zod";

const optionalString = z.string().nullable().optional();
const byteArraySchema = z.array(z.number().int().min(0).max(255));
const nullableByteArraySchema = byteArraySchema.nullish().transform((value) => value ?? []);

const monetaryIntegerSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform((value) => String(value));

export const denominationSchema = z
  .object({
    currency: optionalString,
    dateCreated: optionalString,
    dateUpdated: optionalString,
    id: z.number().int().nonnegative(),
    idCurrency: z.number().int().nonnegative(),
    idUserCreated: z.number().int().nonnegative().optional(),
    idUserUpdated: z.number().int().nonnegative().optional(),
    img: optionalString,
    imgExt: optionalString,
    imgList: nullableByteArraySchema,
    userCreated: optionalString,
    userUpdated: optionalString,
    value: monetaryIntegerSchema,
  })
  .passthrough();
export type CurrencyDenomination = z.infer<typeof denominationSchema>;

export const denominationMutationSchema = denominationSchema.omit({
  dateCreated: true,
  dateUpdated: true,
}).extend({
  imgList: byteArraySchema,
});
export type CurrencyDenominationMutation = z.infer<typeof denominationMutationSchema>;

export const denominationFormSchema = z.object({
  idCurrency: z.string().min(1, "Selecciona una moneda."),
  imgExt: z.string().nullable(),
  imgList: byteArraySchema,
  value: z.string().trim().regex(/^\d+$/, "Ingresa un valor entero igual o mayor a cero."),
});
export type DenominationFormValues = z.infer<typeof denominationFormSchema>;

export const denominationServerMutationSchema = z.object({
  currency: z.string().nullable(),
  id: z.number().int().nonnegative(),
  idCurrency: z.number().int().positive(),
  idUserCreated: z.number().int().nonnegative().optional(),
  idUserUpdated: z.number().int().nonnegative().optional(),
  img: z.string().nullable(),
  imgExt: z.string().nullable(),
  imgList: byteArraySchema,
  userCreated: z.string().nullable().optional(),
  userUpdated: z.string().nullable().optional(),
  value: z.string().regex(/^\d+$/),
});
