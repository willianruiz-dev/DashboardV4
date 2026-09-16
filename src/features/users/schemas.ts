import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullablePositiveId = z.number().int().positive().nullable().optional();
const byteArraySchema = z.array(z.number().int().min(0).max(255));
const allowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]*$/;
const requiredAllowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]+$/;

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "La contraseña debe incluir una mayúscula.")
  .regex(/[a-z]/, "La contraseña debe incluir una minúscula.")
  .regex(/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/]/, "La contraseña debe incluir un carácter especial.");

const userCommonSchema = z.object({
  client: nullableString,
  document: nullableString,
  email: nullableString,
  id: z.number().int().nonnegative(),
  idClient: nullablePositiveId,
  idRole: z.number().int().nonnegative(),
  idTypeDocument: z.number().int().nonnegative(),
  idUserCreated: z.number().int().nonnegative().optional(),
  idUserUpdated: z.number().int().nonnegative().optional(),
  img: nullableString,
  imgExt: nullableString,
  imgList: byteArraySchema.optional(),
  lastName: nullableString,
  name: nullableString,
  phone: nullableString,
  role: nullableString,
  status: z.number().int().nonnegative(),
  typeDocument: nullableString,
  userCreated: nullableString,
  userName: nullableString,
  userUpdated: nullableString,
});

export const userSchema = userCommonSchema.passthrough();
export type DashboardUser = z.infer<typeof userSchema>;

export const userMutationSchema = userCommonSchema.extend({
  pwd: z.string().nullable().optional(),
});
export type UserMutation = z.infer<typeof userMutationSchema>;

export const userCreateRequestSchema = userMutationSchema.extend({
  pwd: passwordSchema,
});
export type UserCreateRequest = z.infer<typeof userCreateRequestSchema>;

export const userUpdateRequestSchema = userMutationSchema.extend({
  pwd: z.null().optional(),
});
export type UserUpdateRequest = z.infer<typeof userUpdateRequestSchema>;

export const userChangePasswordRequestSchema = z.object({
  document: z.string().trim().min(1, "El documento es obligatorio."),
  newPwd: passwordSchema,
  oldPwd: z.string().min(1, "La contraseña actual es obligatoria."),
});
export type UserChangePasswordRequest = z.infer<typeof userChangePasswordRequestSchema>;

export const changeUserPasswordFormSchema = z
  .object({
    confirmation: z.string(),
    newPwd: passwordSchema,
    oldPwd: z.string().min(1, "La contraseña actual es obligatoria."),
  })
  .refine((values) => values.newPwd === values.confirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmation"],
  });
export type ChangeUserPasswordFormValues = z.infer<typeof changeUserPasswordFormSchema>;

export const userEditVerificationRequestSchema = z.object({
  password: z.string().min(1, "La contraseña es obligatoria."),
  userName: z.string().trim().min(1, "El usuario es obligatorio."),
});

const userEditorFieldsSchema = z.object({
  document: z.string().trim().min(1, "El documento es obligatorio.").regex(requiredAllowedTextPattern, "El documento contiene caracteres no permitidos."),
  email: z.string().trim().email("Ingresa un correo válido."),
  idClient: z.string(),
  idRole: z.string().min(1, "Selecciona un rol."),
  idTypeDocument: z.string().min(1, "Selecciona un tipo de documento."),
  imgExt: z.string().nullable(),
  imgList: byteArraySchema,
  lastName: z.string().trim().regex(allowedTextPattern, "El apellido contiene caracteres no permitidos."),
  name: z.string().trim().min(1, "El nombre es obligatorio.").regex(requiredAllowedTextPattern, "El nombre contiene caracteres no permitidos."),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\d+|\+\d+ \d+)$/, "Ingresa un teléfono válido."),
  status: z.boolean(),
  userName: z.string().trim().min(1, "El nombre de usuario es obligatorio.").regex(requiredAllowedTextPattern, "El usuario contiene caracteres no permitidos."),
});

export const userEditorFormSchema = z.discriminatedUnion("mode", [
  userEditorFieldsSchema.extend({
    mode: z.literal("create"),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  }).refine((values) => values.password === values.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
  }),
  userEditorFieldsSchema.extend({
    mode: z.literal("edit"),
    password: z.literal(""),
    passwordConfirmation: z.literal(""),
  }),
]);
export type UserEditorFormValues = z.infer<typeof userEditorFormSchema>;

export const typeDocumentSchema = z
  .object({
    id: z.number().int().positive(),
    typeDocument: z.string().nullable().optional(),
  })
  .passthrough();
