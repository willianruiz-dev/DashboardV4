import { z } from "zod";

const optionalString = z.string().nullable().optional();
const allowedTextPattern = /^[^!#$%^&*(){}[\]:;<>,?~='\\/]+$/;

export const masterKindSchema = z.enum(["Currency", "Region", "TypeDocument"]);
export type MasterKind = z.infer<typeof masterKindSchema>;

export const masterRecordSchema = z
  .object({
    dateCreated: optionalString,
    dateUpdated: optionalString,
    description: optionalString,
    id: z.number().int().nonnegative(),
    idUserCreated: z.number().int().nonnegative().optional(),
    idUserUpdated: z.number().int().nonnegative().optional(),
    name: optionalString,
    typeDocument: optionalString,
    userCreated: optionalString,
    userUpdated: optionalString,
  })
  .passthrough();
export type MasterRecord = z.infer<typeof masterRecordSchema>;

export const masterMutationSchema = masterRecordSchema.omit({
  dateCreated: true,
  dateUpdated: true,
});
export type MasterMutation = z.infer<typeof masterMutationSchema>;

export const masterEditorFormSchema = z.object({
  value: z.string().trim().min(1, "La descripción es obligatoria.").regex(allowedTextPattern, "La descripción contiene caracteres no permitidos."),
});
export type MasterEditorFormValues = z.infer<typeof masterEditorFormSchema>;

export const masterDefinitions: Readonly<Record<MasterKind, { endpoint: MasterKind; field: "description" | "name" | "typeDocument"; singular: string; title: string }>> = {
  Currency: {
    endpoint: "Currency",
    field: "description",
    singular: "moneda",
    title: "Monedas",
  },
  Region: {
    endpoint: "Region",
    field: "name",
    singular: "región",
    title: "Regiones",
  },
  TypeDocument: {
    endpoint: "TypeDocument",
    field: "typeDocument",
    singular: "tipo de documento",
    title: "Tipos de documento",
  },
};

export function getMasterValue(kind: MasterKind, record: MasterRecord): string {
  const field = masterDefinitions[kind].field;
  return record[field] ?? "";
}
