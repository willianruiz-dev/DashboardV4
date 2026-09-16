"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MailPlus, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { alertDefinitions, subscriptionFormSchema, type AlertSubscription, type AlertSubscriptionFormValues } from "@/features/alerts/schemas";
import { useCreateSubscription, useDeleteSubscription, useSubscriptions } from "@/features/alerts/hooks";
import { SearchablePaypadSelect } from "@/features/paypads/components/searchable-paypad-select";
import { usePaypads } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { PayPad } from "@/features/paypads/schemas";

interface SubscriptionFormProps {
  onComplete: () => void;
  paypad: PayPad;
}

function getAlertName(idAlert: number): string {
  return alertDefinitions.find((alert) => alert.id === idAlert)?.description ?? `Alerta ${idAlert}`;
}

function SubscriptionForm({ onComplete, paypad }: SubscriptionFormProps) {
  const createMutation = useCreateSubscription();
  const form = useForm<AlertSubscriptionFormValues>({
    defaultValues: { email: "", idAlert: "" },
    resolver: zodResolver(subscriptionFormSchema),
  });

  async function submit(values: AlertSubscriptionFormValues): Promise<void> {
    const idAlert = Number(values.idAlert);
    const alert = alertDefinitions.find((item) => item.id === idAlert);
    if (!alert) {
      form.setError("idAlert", { message: "Selecciona una alerta válida." });
      return;
    }

    try {
      await createMutation.mutateAsync({
        alert: alert.description,
        email: values.email,
        idAlert: alert.id,
        idPayPad: paypad.id,
        paypad: getPaypadDisplayName(paypad),
      });
      toast.success("Suscripción creada.");
      onComplete();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No fue posible crear la suscripción." });
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MailPlus aria-hidden="true" className="size-4" />Nueva suscripción</CardTitle><CardDescription>La alerta se enviará al correo registrado cuando aplique para el Pay+ seleccionado.</CardDescription></CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" noValidate onSubmit={form.handleSubmit(submit)}>
            {form.formState.errors.root?.message ? <Alert className="md:col-span-3" role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
            <FormField control={form.control} name="idAlert" render={({ field }) => <FormItem><FormLabel>Alerta</FormLabel><Select disabled={createMutation.isPending} onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una alerta" /></SelectTrigger></FormControl><SelectContent>{alertDefinitions.map((alert) => <SelectItem key={alert.id} value={String(alert.id)}>{alert.description}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Correo electrónico</FormLabel><FormControl><Input autoComplete="email" disabled={createMutation.isPending} inputMode="email" type="email" {...field} /></FormControl><FormMessage /></FormItem>} />
            <Button disabled={createMutation.isPending} type="submit">{createMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}{createMutation.isPending ? "Creando…" : "Suscribir"}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AlertsPage() {
  const session = useDashboardSession();
  const canReadSubscriptions = hasPermission(session, "ReadSubs");
  const canWriteSubscriptions = hasPermission(session, "WriteSubs");
  const canDeleteSubscriptions = hasPermission(session, "DelSubs");
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canReadSubscriptions && canReadPaypads);
  const [selectedPaypadId, setSelectedPaypadId] = useState<string>("");
  const selectedPaypad = paypadsQuery.data?.find((paypad) => String(paypad.id) === selectedPaypadId) ?? null;
  const subscriptionsQuery = useSubscriptions(selectedPaypad?.id ?? null, canReadSubscriptions);
  const deleteMutation = useDeleteSubscription();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertSubscription | null>(null);
  const subscriptions = subscriptionsQuery.data ?? [];

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget || !selectedPaypad) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id, paypadId: selectedPaypad.id });
      toast.success("Suscripción eliminada.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar la suscripción.");
    }
  }

  const columns: ColumnDef<AlertSubscription, unknown>[] = [
    { accessorKey: "id", cell: ({ row }) => row.original.id, header: "ID", meta: { mobileLabel: "ID" } },
    { accessorKey: "idAlert", cell: ({ row }) => getAlertName(row.original.idAlert), header: "Alerta", meta: { mobileLabel: "Alerta" } },
    { accessorKey: "email", cell: ({ row }) => row.original.email, header: "Correo", meta: { mobileLabel: "Correo" } },
    {
      id: "actions",
      cell: ({ row }) => canDeleteSubscriptions ? <Button aria-label={`Eliminar suscripción ${row.original.id}`} disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button> : null,
      header: "Acciones",
    },
  ];

  if (!canReadSubscriptions) {
    return <ForbiddenState description="Tu rol no tiene permiso para consultar suscripciones de alertas." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader description="Administra los correos suscritos a alertas de escasez por cada equipo Pay+." title="Alertas" />
      {!canReadPaypads ? <ForbiddenState description="Tu rol puede consultar suscripciones, pero no tiene permiso para listar los Pay+ requeridos por este módulo." /> : null}
      {canReadPaypads ? (
        <Card>
          <CardContent className="grid gap-3 p-5">
            <Label htmlFor="alert-paypad">Pay+ a consultar</Label>
            {paypadsQuery.isPending ? <ListSkeleton rows={1} /> : null}
            {!paypadsQuery.isPending && paypadsQuery.isError ? (
              <ErrorState
                description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar los Pay+."}
                onRetry={() => void paypadsQuery.refetch()}
              />
            ) : null}
            {!paypadsQuery.isPending && !paypadsQuery.isError && paypadsQuery.data?.length === 0 ? (
              <EmptyState description="No hay equipos Pay+ disponibles para administrar alertas." title="No hay Pay+" />
            ) : null}
            {!paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) > 0 ? (
              <SearchablePaypadSelect
                id="alert-paypad"
                onValueChange={(value) => {
                  setSelectedPaypadId(value);
                  setShowForm(false);
                }}
                paypads={paypadsQuery.data ?? []}
                value={selectedPaypadId}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {selectedPaypad && canWriteSubscriptions ? <div className="flex justify-end"><Button onClick={() => setShowForm((current) => !current)} type="button">{showForm ? "Ocultar formulario" : <><Plus aria-hidden="true" className="size-4" />Nueva suscripción</>}</Button></div> : null}
      {selectedPaypad && canWriteSubscriptions && showForm ? <SubscriptionForm key={selectedPaypad.id} onComplete={() => setShowForm(false)} paypad={selectedPaypad} /> : null}
      {!selectedPaypad && canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError ? <EmptyState description="Selecciona un Pay+ para consultar y administrar sus suscripciones." title="Elige un Pay+" /> : null}
      {selectedPaypad && subscriptionsQuery.isPending ? <ListSkeleton rows={4} /> : null}
      {selectedPaypad && !subscriptionsQuery.isPending && subscriptionsQuery.isError ? <ErrorState description={subscriptionsQuery.error instanceof Error ? subscriptionsQuery.error.message : "No fue posible cargar las suscripciones."} onRetry={() => void subscriptionsQuery.refetch()} /> : null}
      {selectedPaypad && !subscriptionsQuery.isPending && !subscriptionsQuery.isError && subscriptions.length === 0 ? <EmptyState description="No hay alertas suscritas para este Pay+." title="No existen alertas creadas" /> : null}
      {selectedPaypad && !subscriptionsQuery.isPending && !subscriptionsQuery.isError && subscriptions.length > 0 ? <ResponsiveDataTable columns={columns} data={subscriptions} getCardDescription={(subscription) => subscription.email} getCardTitle={(subscription) => getAlertName(subscription.idAlert)} getRowId={(subscription) => String(subscription.id)} label="Suscripciones de alertas" /> : null}
      <DestructiveConfirmationDialog isPending={deleteMutation.isPending} onConfirm={() => void confirmDelete()} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteTarget(null); }} open={deleteTarget !== null} recordLabel={deleteTarget ? `${deleteTarget.email} — ${getAlertName(deleteTarget.idAlert)}` : "la suscripción seleccionada"} verificationText={deleteTarget ? String(deleteTarget.id) : undefined} />
    </div>
  );
}
