import { z } from "zod";

const optionalString = z.string().nullable().optional();
const requiredTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]+$/;
const integerStringSchema = z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).transform((value) => String(value));
const decimalStringSchema = z
  .union([z.number().finite(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .transform((value) => String(value));

export const paypadSchema = z
  .object({
    currency: optionalString,
    dateCreated: optionalString,
    dateUpdated: optionalString,
    description: optionalString,
    id: z.number().int().nonnegative(),
    idCurrency: z.number().int().nonnegative(),
    idOffice: z.number().int().nonnegative(),
    idUserCreated: z.number().int().nonnegative().optional(),
    idUserUpdated: z.number().int().nonnegative().optional(),
    latitude: optionalString,
    longitude: optionalString,
    office: optionalString,
    pwd: optionalString,
    status: z.number().int().nonnegative(),
    userCreated: optionalString,
    userName: optionalString,
    userUpdated: optionalString,
    username: optionalString,
  })
  .passthrough();
export type PayPad = z.infer<typeof paypadSchema>;

export const paypadMutationSchema = paypadSchema.omit({
  dateCreated: true,
  dateUpdated: true,
}).extend({
  pwd: z.string().nullable().optional(),
});
export type PayPadMutation = z.infer<typeof paypadMutationSchema>;

const paypadEditorFieldsSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente."),
  description: z.string().trim().min(1, "La descripción es obligatoria.").regex(requiredTextPattern, "La descripción contiene caracteres no permitidos."),
  idCurrency: z.string().min(1, "Selecciona una moneda."),
  idOffice: z.string().min(1, "Selecciona una sucursal."),
  latitude: z.string().trim().min(1, "La latitud es obligatoria.").regex(/^-?\d+(?:\.\d+)?$/, "La latitud debe ser un número decimal."),
  longitude: z.string().trim().min(1, "La longitud es obligatoria.").regex(/^-?\d+(?:\.\d+)?$/, "La longitud debe ser un número decimal."),
  status: z.boolean(),
  username: z.string().trim().min(1, "El usuario es obligatorio.").regex(requiredTextPattern, "El usuario contiene caracteres no permitidos."),
});

export const paypadEditorFormSchema = z.discriminatedUnion("mode", [
  paypadEditorFieldsSchema.extend({
    mode: z.literal("create"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Z]/, "La contraseña debe incluir una mayúscula.")
      .regex(/[a-z]/, "La contraseña debe incluir una minúscula.")
      .regex(/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/]/, "La contraseña debe incluir un carácter especial."),
    passwordConfirmation: z.string(),
  }).refine((values) => values.password === values.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
  }),
  paypadEditorFieldsSchema.extend({
    mode: z.literal("edit"),
    password: z.literal(""),
    passwordConfirmation: z.literal(""),
  }),
]);
export type PayPadEditorFormValues = z.infer<typeof paypadEditorFormSchema>;

export const paypadCreateRequestSchema = paypadMutationSchema.extend({
  pwd: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/]/),
});
export type PayPadCreateRequest = z.infer<typeof paypadCreateRequestSchema>;

export const paypadChangePasswordRequestSchema = z.object({
  document: z.string().trim().min(1),
  newPwd: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/]/),
  oldPwd: z.string().min(1),
});

export const paypadStorageSchema = z
  .object({
    apStored: integerStringSchema,
    apTotal: decimalStringSchema,
    dateCreated: optionalString,
    dateUpdated: optionalString,
    denominationValue: integerStringSchema,
    dpStored: integerStringSchema,
    dpTotal: decimalStringSchema,
    id: z.number().int().nonnegative(),
    idCurrencyDenomination: z.number().int().positive(),
    idPayPad: z.number().int().positive(),
    imgDenom: optionalString,
    isDispensing: z.boolean(),
    minDpQuantity: integerStringSchema,
    payPad: optionalString,
    quantityStored: integerStringSchema,
    rjStored: integerStringSchema,
    rjTotal: decimalStringSchema,
    total: decimalStringSchema,
  })
  .passthrough();
export type PayPadStorage = z.infer<typeof paypadStorageSchema>;

export const paypadStorageMutationSchema = z.object({
  idCurrencyDenomination: z.number().int().positive(),
  idPayPad: z.number().int().positive(),
  isDispensing: z.boolean(),
  minDpQuantity: z.string().regex(/^\d+$/),
});
export type PayPadStorageMutation = z.infer<typeof paypadStorageMutationSchema>;

export const loadDetailSchema = z
  .object({
    denominationValue: integerStringSchema,
    id: z.number().int().nonnegative().optional(),
    // Historical list procedures can omit this joined value; .NET then serializes
    // the non-nullable DTO property as 0. It is only used to match an optional
    // denomination image in the history view, never as a mutation identifier.
    idCurrencyDenomination: z.number().int().nonnegative(),
    idLoad: z.number().int().nonnegative().optional(),
    quantity: integerStringSchema,
  })
  .passthrough();
export type LoadDetail = z.infer<typeof loadDetailSchema>;

export const loadSchema = z
  .object({
    dateCreated: optionalString,
    details: z.array(loadDetailSchema).nullish().transform((details) => details ?? []),
    id: z.number().int().nonnegative(),
    // GetByPaypad procedures already receive the selected Pay+ ID and can return
    // the DTO's default 0 when the ID_PAYPAD column is not included in their row.
    // Do not reject otherwise valid historical movements for that non-displayed key.
    idPayPad: z.number().int().nonnegative(),
    totalLoaded: decimalStringSchema,
  })
  .passthrough();
export type Load = z.infer<typeof loadSchema>;

export const loadMutationSchema = z.object({
  details: z.array(z.object({
    denominationValue: z.string().regex(/^\d+$/),
    idCurrencyDenomination: z.number().int().positive(),
    quantity: z.string().regex(/^\d+$/),
  })).min(1),
  idPayPad: z.number().int().positive(),
  totalLoaded: z.string().regex(/^\d+$/),
});
export type LoadMutation = z.infer<typeof loadMutationSchema>;

export const tonnageDetailSchema = z
  .object({
    denominationValue: integerStringSchema,
    id: z.number().int().nonnegative().optional(),
    // See LoadDetail: 0 is a legacy read-model sentinel when a joined column was
    // not selected. Create/update payloads remain strictly positive elsewhere.
    idCurrencyDenomination: z.number().int().nonnegative(),
    idTonnage: z.number().int().nonnegative().optional(),
    quantityAp: integerStringSchema,
    quantityDp: integerStringSchema,
    quantityRj: integerStringSchema,
    quantityTotal: integerStringSchema,
  })
  .passthrough();
export type TonnageDetail = z.infer<typeof tonnageDetailSchema>;

export const tonnageSchema = z
  .object({
    dateCreated: optionalString,
    details: z.array(tonnageDetailSchema).nullish().transform((details) => details ?? []),
    id: z.number().int().nonnegative(),
    // The history endpoint can expose 0 for an omitted ID_PAYPAD join. The selected
    // card owns the actual Pay+ ID; this value is not reused for a mutation.
    idPayPad: z.number().int().nonnegative(),
    total: decimalStringSchema,
    totalAp: decimalStringSchema,
    totalDp: decimalStringSchema,
    totalRj: decimalStringSchema,
  })
  .passthrough();
export type Tonnage = z.infer<typeof tonnageSchema>;

// The legacy screen sends the storage snapshot totals when it registers an arqueo.
// The upstream procedure recalculates them as well, but preserving this payload is part
// of the old dashboard contract.
export const tonnageMutationSchema = z.object({
  idPayPad: z.number().int().positive(),
  total: decimalStringSchema,
  totalAp: decimalStringSchema,
  totalDp: decimalStringSchema,
  totalRj: decimalStringSchema,
});
export type TonnageMutation = z.infer<typeof tonnageMutationSchema>;

export const paypadConfigurationSchema = z
  .object({
    arduinoPort: z.string().nullable().optional(),
    dateCreated: optionalString,
    debug: z.boolean(),
    dispenserDenominations: z.string().nullable().optional(),
    dispenserPort: z.string().nullable().optional(),
    extraDataJson: z.array(z.object({ key: z.string(), value: z.string() })).nullable().optional(),
    id: z.number().int().nonnegative(),
    idPaypad: z.number().int().nullable().optional(),
    idUserCreated: z.number().int().nonnegative().optional(),
    meiPort: z.string().nullable().optional(),
    paypad: z.string().nullable().optional(),
    printerPort: z.string().nullable().optional(),
    scannerPort: z.string().nullable().optional(),
    validatePeripherals: z.boolean(),
  })
  .passthrough();
export type PayPadConfiguration = z.infer<typeof paypadConfigurationSchema>;

export const paypadConfigurationFormSchema = z.object({
  arduinoPort: z.string().trim().min(1, "El puerto de Arduino es obligatorio."),
  debug: z.boolean(),
  dispenserDenominations: z.string().trim().min(1, "Las denominaciones del dispensador son obligatorias."),
  dispenserPort: z.string().trim().min(1, "El puerto del dispensador es obligatorio."),
  extraDataJson: z.array(z.object({ key: z.string().trim().min(1, "La clave es obligatoria."), value: z.string() })),
  meiPort: z.string().trim().min(1, "El puerto MEI es obligatorio."),
  printerPort: z.string().trim().min(1, "El puerto de impresora es obligatorio."),
  scannerPort: z.string().trim().min(1, "El puerto del scanner es obligatorio."),
  validatePeripherals: z.boolean(),
});
export type PayPadConfigurationFormValues = z.infer<typeof paypadConfigurationFormSchema>;

export const paypadConfigurationMutationSchema = z.object({
  arduinoPort: z.string().min(1),
  debug: z.boolean(),
  dispenserDenominations: z.string().min(1),
  dispenserPort: z.string().min(1),
  extraDataJson: z.array(z.object({ key: z.string().min(1), value: z.string() })),
  id: z.number().int().nonnegative().optional(),
  idPaypad: z.number().int().positive(),
  idUserCreated: z.number().int().nonnegative().optional(),
  meiPort: z.string().min(1),
  printerPort: z.string().min(1),
  scannerPort: z.string().min(1),
  validatePeripherals: z.boolean(),
});
export type PayPadConfigurationMutation = z.infer<typeof paypadConfigurationMutationSchema>;
