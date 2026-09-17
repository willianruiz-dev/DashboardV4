import { z } from "zod";

const optionalString = z.string().nullable().optional();
const integerStringSchema = z.union([z.number().int(), z.string().regex(/^-?\d+$/)]).transform((value) => String(value));
const moneyStringSchema = z.union([z.number().finite(), z.string().regex(/^-?\d+(?:\.\d+)?$/)]).transform((value) => String(value));

export const transactionSchema = z
  .object({
    dateCreated: optionalString,
    description: optionalString,
    document: optionalString,
    id: z.number().int().nonnegative(),
    idPayPad: z.number().int().positive(),
    idStateTransaction: z.number().int().optional(),
    idTypePayment: z.number().int().optional(),
    idTypeTransaction: z.number().int().optional(),
    incomeAmount: moneyStringSchema,
    // Added by the server-side transaction search after resolving idPayPad against
    // the PayPad list. `paypad` is retained only as the untouched legacy DTO field.
    paypadUsername: optionalString,
    paypad: optionalString,
    product: optionalString,
    realAmount: moneyStringSchema,
    reference: optionalString,
    returnAmount: moneyStringSchema,
    stateTransaction: optionalString,
    totalAmount: moneyStringSchema,
    typePayment: optionalString,
    typeTransaction: optionalString,
  })
  .passthrough();
export type DashboardTransaction = z.infer<typeof transactionSchema>;

export const transactionDetailSchema = z
  .object({
    currencyDenomination: integerStringSchema.optional(),
    id: z.number().int().nonnegative().optional(),
    idCurrencyDenomination: z.number().int().positive(),
    idTransaction: z.number().int().positive(),
    idTypeOperation: z.number().int().optional(),
    quantity: integerStringSchema.default("1"),
    typeOperation: optionalString,
  })
  .passthrough();
export type DashboardTransactionDetail = z.infer<typeof transactionDetailSchema>;

export const transactionSortKeySchema = z.enum([
  "dateCreated",
  "id",
  "product",
  "stateTransaction",
  "totalAmount",
  "typePayment",
  "typeTransaction",
]);
export type TransactionSortKey = z.infer<typeof transactionSortKeySchema>;

export const transactionPaymentTypes = ["Efectivo", "Tarjeta"] as const;
export const transactionPaymentTypeSchema = z.enum(transactionPaymentTypes);
export type TransactionPaymentType = z.infer<typeof transactionPaymentTypeSchema>;

export const transactionSearchRequestSchema = z.object({
  from: z.string().datetime({ offset: true }),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(5).max(100),
  paymentType: transactionPaymentTypeSchema.nullable().default(null),
  paypadId: z.number().int().positive().nullable(),
  product: z.string().nullable(),
  sortDirection: z.enum(["asc", "desc"]),
  sortKey: transactionSortKeySchema,
  to: z.string().datetime({ offset: true }),
});
export type TransactionSearchRequest = z.infer<typeof transactionSearchRequestSchema>;

export const transactionSearchFormSchema = z.object({
  from: z.string().min(1, "Selecciona la fecha y hora inicial."),
  paymentType: z.union([z.literal("all"), transactionPaymentTypeSchema]),
  paypadId: z.string().refine((value) => value === "all" || /^\d+$/.test(value), "Selecciona un Pay+."),
  to: z.string().min(1, "Selecciona la fecha y hora final."),
});
export type TransactionSearchFormValues = z.infer<typeof transactionSearchFormSchema>;

export const transactionStateBucketSchema = z.object({
  count: z.number().int().nonnegative(),
  total: z.string(),
});
export type TransactionStateBucket = z.infer<typeof transactionStateBucketSchema>;

export const transactionCurrencyBucketSchema = z.object({
  approvedCount: z.number().int().nonnegative(),
  approvedTotal: moneyStringSchema,
  cancelledCount: z.number().int().nonnegative(),
  cardTotal: moneyStringSchema,
  cashTotal: moneyStringSchema,
  currencyId: z.number().int().positive().nullable(),
  currencyLabel: z.string(),
  mixed: z.boolean().default(false),
});
export type TransactionCurrencyBucket = z.infer<typeof transactionCurrencyBucketSchema>;

export const transactionSummarySchema = z.object({
  approvedCount: z.number().int().nonnegative(),
  approvedTotal: moneyStringSchema,
  /**
   * Totales del período por moneda. Con más de un grupo, la interfaz muestra un recaudo por
   * moneda en lugar de un único total que sumaría monedas distintas; `mixed` agrupa las
   * máquinas de cambio divisa, cuyos importes no son atribuibles a una sola moneda.
   */
  byCurrency: z.array(transactionCurrencyBucketSchema).default([]),
  byState: z.record(z.string(), transactionStateBucketSchema).default({}),
  cancelledCount: z.number().int().nonnegative(),
  cardTotal: moneyStringSchema,
  cashTotal: moneyStringSchema,
});
export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

export const transactionSearchResponseSchema = z.object({
  items: z.array(transactionSchema),
  products: z.array(z.string()),
  summary: transactionSummarySchema,
  total: z.number().int().nonnegative(),
  transactionIds: z.array(z.number().int().positive()),
});
export type TransactionSearchResponse = z.infer<typeof transactionSearchResponseSchema>;

export const transactionDetailsResponseSchema = z.array(transactionDetailSchema);

export const excelRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  paypadId: z.number().int().positive(),
  transactionIds: z.array(z.number().int().positive()).min(1),
});
export type ExcelRequest = z.infer<typeof excelRequestSchema>;

export const videoRequestSchema = z.object({
  idPaypad: z.number().int().positive(),
  idTransaction: z.number().int().positive(),
});
export type VideoRequest = z.infer<typeof videoRequestSchema>;
