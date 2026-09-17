import { z } from "zod";

export const httpEnvelopeSchema = <T extends z.ZodType>(responseSchema: T) =>
  z.object({
    message: z.string().nullable().optional(),
    response: responseSchema,
    statusCode: z.number().int(),
  });

export const httpErrorSchema = z.object({
  description: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  stackTrace: z.string().nullable().optional(),
  statusCode: z.number().int(),
});

export type HttpEnvelope<T> = {
  message?: string | null;
  response: T;
  statusCode: number;
};

export type HttpError = z.infer<typeof httpErrorSchema>;
