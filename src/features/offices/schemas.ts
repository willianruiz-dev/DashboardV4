import { z } from "zod";

const optionalString = z.string().nullable().optional();
const allowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]+$/;

export const officeSchema = z
  .object({
    address: optionalString,
    dateCreated: optionalString,
    dateUpdated: optionalString,
    id: z.number().int().nonnegative(),
    idClient: z.number().int().nonnegative(),
    idUserCreated: z.number().int().nonnegative().optional(),
    idUserUpdated: z.number().int().nonnegative().optional(),
    name: optionalString,
    userCreated: optionalString,
    userUpdated: optionalString,
  })
  .passthrough();
export type DashboardOffice = z.infer<typeof officeSchema>;

export const officeMutationSchema = officeSchema.omit({
  dateCreated: true,
  dateUpdated: true,
});
export type OfficeMutation = z.infer<typeof officeMutationSchema>;

export const officeEditorFormSchema = z.object({
  address: z.string().trim().min(1, "La dirección es obligatoria.").regex(allowedTextPattern, "La dirección contiene caracteres no permitidos."),
  name: z.string().trim().min(1, "El nombre es obligatorio.").regex(allowedTextPattern, "El nombre contiene caracteres no permitidos."),
});
export type OfficeEditorFormValues = z.infer<typeof officeEditorFormSchema>;
