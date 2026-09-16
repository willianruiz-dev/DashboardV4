import { z } from "zod";

export const lookupClientSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

export const lookupOfficeSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

export const lookupCurrencySchema = z
  .object({
    description: z.string().nullable().optional(),
    id: z.number().int().positive(),
  })
  .passthrough();

export const lookupTypeDocumentSchema = z
  .object({
    id: z.number().int().positive(),
    typeDocument: z.string().nullable().optional(),
  })
  .passthrough();

export const lookupRegionSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().nullable().optional(),
  })
  .passthrough();
