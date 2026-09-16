import { z } from "zod";

const optionalString = z.string().nullable().optional();
const byteArraySchema = z.array(z.number().int().min(0).max(255));
const allowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]*$/;
const requiredAllowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]+$/;

export const clientSchema = z
  .object({
    dateCreated: optionalString,
    dateUpdated: optionalString,
    email: optionalString,
    id: z.number().int().nonnegative(),
    idRegion: z.number().int().nonnegative(),
    idUserCreated: z.number().int().nonnegative().optional(),
    idUserUpdated: z.number().int().nonnegative().optional(),
    imgExt: optionalString,
    logoImg: optionalString,
    logoImgList: byteArraySchema.optional(),
    name: optionalString,
    nit: optionalString,
    phone: optionalString,
    region: optionalString,
    userCreated: optionalString,
    userUpdated: optionalString,
  })
  .passthrough();
export type DashboardClient = z.infer<typeof clientSchema>;

export const clientMutationSchema = clientSchema.omit({
  dateCreated: true,
  dateUpdated: true,
}).extend({
  logoImgList: byteArraySchema,
});
export type ClientMutation = z.infer<typeof clientMutationSchema>;

export const clientEditorFormSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio.").regex(allowedTextPattern, "El correo contiene caracteres no permitidos."),
  idRegion: z.string().min(1, "Selecciona una región."),
  imgExt: z.string().nullable(),
  logoImgList: byteArraySchema,
  name: z.string().trim().min(1, "El nombre es obligatorio.").regex(requiredAllowedTextPattern, "El nombre contiene caracteres no permitidos."),
  nit: z.string().trim().min(1, "El NIT es obligatorio.").regex(requiredAllowedTextPattern, "El NIT contiene caracteres no permitidos."),
  phone: z.string().trim().regex(allowedTextPattern, "El teléfono contiene caracteres no permitidos."),
});
export type ClientEditorFormValues = z.infer<typeof clientEditorFormSchema>;
