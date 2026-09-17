"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchablePaypadSelect } from "@/features/paypads/components/searchable-paypad-select";
import type { PayPad } from "@/features/paypads/schemas";
import {
  transactionPaymentTypes,
  transactionSearchFormSchema,
  type TransactionPaymentType,
  type TransactionSearchFormValues,
} from "@/features/transactions/schemas";
import { localDateTimeToApiIso } from "@/lib/formatters/date";

export interface TransactionFiltersValues {
  from: string;
  paymentType: TransactionPaymentType | null;
  paypadId: number | null;
  to: string;
}

interface TransactionFiltersProps {
  allowAllPaypads?: boolean;
  defaultRange: { from: string; to: string };
  disabled?: boolean;
  onSearch: (values: TransactionFiltersValues) => void;
  paypads: readonly PayPad[];
}

export function TransactionFilters({ allowAllPaypads = false, defaultRange, disabled = false, onSearch, paypads }: TransactionFiltersProps) {
  const form = useForm<TransactionSearchFormValues>({
    defaultValues: { from: defaultRange.from, paymentType: "all", paypadId: "", to: defaultRange.to },
    resolver: zodResolver(transactionSearchFormSchema),
  });

  function submit(values: TransactionSearchFormValues): void {
    if (!allowAllPaypads && values.paypadId === "all") {
      form.setError("paypadId", { message: "Selecciona un Pay+ específico." });
      return;
    }

    // The legacy date picker initializes the day at 12:00 a. m. and closes it at
    // 11:59:59.999 p. m. Keep that inclusive range even though datetime-local
    // displays minutes only.
    const from = localDateTimeToApiIso(values.from);
    const to = localDateTimeToApiIso(values.to, { endOfMinute: true });

    if (!from || !to) {
      form.setError("root", { message: "Las fechas deben tener un formato válido." });
      return;
    }

    if (from > to) {
      form.setError("to", { message: "La fecha final debe ser posterior a la fecha inicial." });
      return;
    }

    const paypadId = values.paypadId === "all" ? null : Number(values.paypadId);

    if (paypadId !== null && (!Number.isSafeInteger(paypadId) || paypadId < 1)) {
      form.setError("paypadId", { message: "Selecciona un Pay+ válido." });
      return;
    }

    const paymentType = values.paymentType === "all" ? null : values.paymentType;
    onSearch({ from, paymentType, paypadId, to });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parámetros de búsqueda</CardTitle>
        <CardDescription>
          Busca un equipo por nombre o ID. Desde inicia hoy automáticamente a las 12:00 a. m.; las fechas se envían al API en formato ISO 8601 con zona UTC explícita.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end"
            noValidate
            onSubmit={form.handleSubmit(submit)}
          >
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive xl:col-span-5" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="paypadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay+</FormLabel>
                  <FormControl>
                    <SearchablePaypadSelect
                      allowAllPaypads={allowAllPaypads}
                      disabled={disabled}
                      onValueChange={field.onChange}
                      paypads={paypads}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medio de pago</FormLabel>
                  <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {transactionPaymentTypes.map((paymentType) => <SelectItem key={paymentType} value={paymentType}>{paymentType}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desde</FormLabel>
                  <FormControl>
                    <Input disabled={disabled} type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasta</FormLabel>
                  <FormControl>
                    <Input disabled={disabled} type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={disabled} type="submit" variant="success">
              <Search aria-hidden="true" className="size-4" />
              Consultar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
